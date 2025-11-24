export const STATUS_ORDER = ['open','in_progress','resolved','wont_fix'];
export const STATUS_LABEL = STATUS_ORDER.reduce((acc, k) => {
  acc[k] = k === 'in_progress' ? 'In Progress' : k === 'wont_fix' ? "Won't Fix" : k.charAt(0).toUpperCase() + k.slice(1);
  return acc;
}, {});

export const SEARCH_SCOPE_MAP = {
  name: ['name'],
  title: ['title'],
  message: ['message'],
  name_title: ['name','title'],
  name_message: ['name','message'],
  title_message: ['title','message'],
  all: ['name','title','message']
};
