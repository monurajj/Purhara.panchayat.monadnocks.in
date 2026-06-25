function showProjectModal(project) {
  const modal = document.getElementById('project-modal');
  if (!modal) return;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '—';
  };

  set('modal-sno', project.s_no);
  set('modal-desc', field(project, 'activity_description'));
  set('modal-code', project.activity_code);
  set('modal-type', field(project, 'activity_type'));
  set('modal-focus', field(project, 'focus_area'));
  set('modal-scheme', field(project, 'scheme_name'));
  set('modal-component', field(project, 'scheme_component_name'));
  set('modal-cost', formatCurrency(project.total_cost));

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
  const modal = document.getElementById('project-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function initModal() {
  document.getElementById('modal-close')?.addEventListener('click', closeProjectModal);
  document.getElementById('project-modal')?.addEventListener('click', e => {
    if (e.target.id === 'project-modal') closeProjectModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeProjectModal();
  });
}
