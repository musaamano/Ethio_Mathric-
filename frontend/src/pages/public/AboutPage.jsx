import React from 'react';
import PublicLayout from '../../components/layout/PublicLayout';

const TEAM = [
  { name: 'Abebe Kebede',   role: 'Founder & CEO',         emoji: '👨🏿‍💼', bio: 'Former Grade 12 teacher with 10+ years in Ethiopian education.' },
  { name: 'Tigist Haile',   role: 'Head of Content',       emoji: '👩🏽‍🏫', bio: 'Matric exam specialist with expertise in Natural Science.' },
  { name: 'Dawit Mengistu', role: 'Lead Developer',        emoji: '👨🏾‍💻', bio: 'Full stack engineer passionate about EdTech in Africa.' },
  { name: 'Selam Girma',    role: 'Student Success Lead',  emoji: '👩🏿‍🎓', bio: 'Scored 97% in her own Matric — now helps others do the same.' },
];

const VALUES = [
  { icon: '🎯', title: 'Exam-Focused',    desc: 'Every question, note, and mock exam is built specifically for the Ethiopian National Matric Examination.' },
  { icon: '🌍', title: 'Accessible',      desc: 'Affordable plans and a free tier ensure every student in Ethiopia can access quality preparation.' },
  { icon: '💡', title: 'Explanation-First', desc: 'We believe understanding beats memorisation. Every question has a detailed explanation, not just an answer.' },
  { icon: '📊', title: 'Data-Driven',     desc: 'Our analytics help students identify weak areas and focus their study time where it matters most.' },
];

export default function AboutPage() {
  return (
    <div className="bg-surface">
      {/* Hero */}
      <section className="relative py-24 bg-hero-gradient overflow-hidden">
        <div className="orb w-96 h-96 bg-sage-300/40 -top-20 -right-20" />
        <div className="section-container relative z-10 text-center">
          <div className="badge bg-white/70 border border-sage-200 text-primary-600 mb-4 mx-auto w-fit">🇪🇹 Made in Ethiopia</div>
          <h1 className="font-display font-extrabold text-5xl text-primary-700 mb-4">
            About Ethio Matric Academy
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            We exist for one reason: to help every Ethiopian Grade 12 student 
            walk into the Matric exam with confidence and come out with the 
            score they deserve.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="badge bg-mint-light text-primary-600 border border-sage-200 mb-4">Our Mission</div>
              <h2 className="font-display font-extrabold text-4xl text-primary-700 mb-5">
                Democratise Quality<br/>Exam Preparation
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                In Ethiopia, access to quality Matric preparation has historically depended on 
                where you live and how much you can afford. Students in major cities had access 
                to expensive tutors and prep centres. Students in rural areas had almost nothing.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                We built Ethio Matric Academy to change that. With a smartphone and a modest 
                subscription, any student in any region of Ethiopia can now access the same 
                high-quality practice questions, mock exams, and study notes.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Our platform is built <strong className="text-primary-600">by Ethiopians, for Ethiopians</strong> — 
                deeply aligned with the national curriculum and exam format.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '12,000+', label: 'Students',     icon: '🧑‍🎓' },
                { value: '10,000+', label: 'Questions',    icon: '📚' },
                { value: '95%',     label: 'Pass Rate',    icon: '🎯' },
                { value: '11',      label: 'Regions',      icon: '🌍' },
              ].map(s => (
                <div key={s.label} className="soft-card p-5 text-center">
                  <div className="text-4xl mb-2">{s.icon}</div>
                  <div className="font-display font-extrabold text-3xl text-primary-600">{s.value}</div>
                  <div className="text-sm text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="font-display font-extrabold text-4xl text-primary-700 mb-3">Our Values</h2>
            <p className="text-gray-500 max-w-xl mx-auto">The principles that guide how we build and what we build.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map(v => (
              <div key={v.title} className="soft-card p-5 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h3 className="font-display font-bold text-primary-700 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="font-display font-extrabold text-4xl text-primary-700 mb-3">Meet the Team</h2>
            <p className="text-gray-500 max-w-xl mx-auto">A small team with a big mission.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TEAM.map(m => (
              <div key={m.name} className="soft-card p-5 text-center hover:shadow-card-hover transition-all duration-300">
                <div className="w-16 h-16 rounded-3xl bg-mint-light flex items-center justify-center text-4xl mx-auto mb-4 shadow-soft">{m.emoji}</div>
                <h3 className="font-display font-bold text-primary-700">{m.name}</h3>
                <p className="text-xs font-semibold text-sage-500 mb-2">{m.role}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
