import { supabase } from '../lib/supabase';

export async function initSaveButtons() {
  const buttons = document.querySelectorAll('[data-save-btn]');
  if (buttons.length === 0) return;

  const { data: { user } } = await supabase.auth.getUser();

  let savedIds = new Set<string>();
  if (user) {
    const { data } = await supabase
      .from('saved_listings')
      .select('product_id')
      .eq('user_id', user.id);
    savedIds = new Set((data || []).map((r: any) => String(r.product_id)));
  }

  buttons.forEach((btn) => {
    const el = btn as HTMLElement;
    const id = el.dataset.productId;
    if (!id) return;

    if (savedIds.has(id)) {
      el.classList.add('is-saved');
      el.setAttribute('aria-label', 'Remove from saved');
    }

    el.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const isSaved = el.classList.contains('is-saved');
      el.disabled = true;

      if (isSaved) {
        const { error } = await supabase
          .from('saved_listings')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', Number(id));
        if (!error) {
          el.classList.remove('is-saved');
          el.setAttribute('aria-label', 'Save product');
        }
      } else {
        const { error } = await supabase
          .from('saved_listings')
          .insert({ user_id: user.id, product_id: Number(id) });
        if (!error) {
          el.classList.add('is-saved');
          el.setAttribute('aria-label', 'Remove from saved');
        }
      }

      el.disabled = false;
    });
  });
}