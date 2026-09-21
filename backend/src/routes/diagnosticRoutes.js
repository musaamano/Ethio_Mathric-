'use strict';

const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');

const router = require('express').Router();

const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 587;
const TCP_TIMEOUT_MS = 10000;

function hasValidDiagnosticToken(providedToken) {
    const configuredToken = process.env.SMTP_DIAGNOSTIC_TOKEN;
    if (!configuredToken || !providedToken) return false;

    const provided = Buffer.from(providedToken);
    const expected = Buffer.from(configuredToken);
    return provided.length === expected.length
        && crypto.timingSafeEqual(provided, expected);
}

function connectToResolvedAddress(address) {
    return new Promise(resolve => {
        const startedAt = process.hrtime.bigint();
        const socket = net.createConnection({
            host: address.address,
            port: SMTP_PORT,
            family: address.family,
        });
        let settled = false;

        const finish = result => {
            if (settled) return;
            settled = true;
            socket.destroy();
            resolve({ ...result, elapsedMs: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6) });
        };

        socket.setTimeout(TCP_TIMEOUT_MS);
        socket.once('connect', () => finish({ tcp: 'success' }));
        socket.once('timeout', () => finish({ tcp: 'timeout' }));
        socket.once('error', error => finish({
            tcp: 'error',
            error: ['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH'].includes(error.code)
                ? error.code
                : 'connection_error',
        }));
    });
}

router.get('/smtp-connectivity', async (req, res, next) => {
    if (!hasValidDiagnosticToken(req.get('x-smtp-diagnostic-token'))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const response = { target: `${SMTP_HOST}:${SMTP_PORT}` };

    try {
        const addresses = await dns.lookup(SMTP_HOST, { all: true });
        response.dns = 'success';

        const result = await connectToResolvedAddress(addresses[0]);
        Object.assign(response, result);

        const statusCode = result.tcp === 'success' ? 200 : result.tcp === 'timeout' ? 504 : 502;
        return res.status(statusCode).json(response);
    } catch (error) {
        response.dns = 'failed';
        response.tcp = 'not_tested';
        response.error = ['ENOTFOUND', 'EAI_AGAIN', 'EAI_FAIL', 'EAI_NODATA'].includes(error.code)
            ? error.code
            : 'dns_resolution_failed';
        return res.status(502).json(response);
    }
});

module.exports = router;