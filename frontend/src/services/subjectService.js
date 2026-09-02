/**
 * subjectService.js — Stream → Subject → Question
 * Chapters removed.
 */
import api from './api';

const subjectService = {

  getStreams: async () => {
    const { data } = await api.get('/subjects/streams');
    return data.data;
  },

  getSubjects: async (stream_id) => {
    const { data } = await api.get('/subjects', { params: stream_id ? { stream_id } : {} });
    return data.data;
  },

  getSubject: async (slug) => {
    const { data } = await api.get(`/subjects/${slug}`);
    return data.data;
  },

  // Admin
  createSubject: async (payload) => {
    const { data } = await api.post('/subjects', payload);
    return data.data;
  },
  updateSubject: async (id, payload) => {
    const { data } = await api.put(`/subjects/${id}`, payload);
    return data;
  },
  deleteSubject: async (id) => {
    const { data } = await api.delete(`/subjects/${id}`);
    return data;
  },
};

export default subjectService;
