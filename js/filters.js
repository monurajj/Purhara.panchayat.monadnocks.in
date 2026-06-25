class ProjectFilter {
  constructor(projects) {
    this.all = projects;
    this.filters = {
      village: '',
      focusArea: '',
      scheme: '',
      search: '',
      costMin: 0,
      costMax: Infinity,
    };
    this.sort = { field: 's_no', dir: 'asc' };
    this.page = 1;
    this.perPage = 15;
    this.maxCost = Math.max(...projects.map(p => p.total_cost), 1000000);
  }

  setFilter(key, value) {
    this.filters[key] = value;
    this.page = 1;
  }

  setSort(field) {
    if (this.sort.field === field) {
      this.sort.dir = this.sort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort.field = field;
      this.sort.dir = 'asc';
    }
  }

  applyFromURL() {
    const params = new URLSearchParams(window.location.search);
    ['village', 'focusArea', 'scheme', 'search'].forEach(k => {
      if (params.has(k)) this.filters[k] = params.get(k);
    });
    if (params.has('costMin')) this.filters.costMin = Number(params.get('costMin'));
    if (params.has('costMax')) this.filters.costMax = Number(params.get('costMax'));
    if (params.has('page')) this.page = Number(params.get('page'));
  }

  getFiltered() {
    let result = [...this.all];

    if (this.filters.village) {
      result = result.filter(p => p.village === this.filters.village);
    }
    if (this.filters.focusArea) {
      result = result.filter(p => p.focus_area === this.filters.focusArea);
    }
    if (this.filters.scheme) {
      result = result.filter(p => p.scheme_name === this.filters.scheme);
    }
    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      result = result.filter(p =>
        p.activity_description.toLowerCase().includes(q) ||
        (p.activity_description_hi && p.activity_description_hi.includes(q)) ||
        String(p.activity_code).includes(q) ||
        p.village.toLowerCase().includes(q)
      );
    }
    result = result.filter(p =>
      p.total_cost >= this.filters.costMin && p.total_cost <= this.filters.costMax
    );

    const { field, dir } = this.sort;
    result.sort((a, b) => {
      let av = a[field], bv = b[field];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }

  getPage() {
    const filtered = this.getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.perPage));
    if (this.page > totalPages) this.page = totalPages;
    const start = (this.page - 1) * this.perPage;
    return {
      items: filtered.slice(start, start + this.perPage),
      total: filtered.length,
      page: this.page,
      totalPages,
    };
  }
}
