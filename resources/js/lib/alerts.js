import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const ReactSwal = withReactContent(Swal);

export const Toast = ReactSwal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export function toastSuccess(title = 'Success', text = undefined) {
  return Toast.fire({ icon: 'success', title, text });
}

export function toastError(title = 'Error', text = undefined) {
  return Toast.fire({ icon: 'error', title, text });
}

export function toastWarning(title = 'Notice', text = undefined) {
  return Toast.fire({ icon: 'warning', title, text });
}

export function toastInfo(title = 'Info', text = undefined) {
  return Toast.fire({ icon: 'info', title, text });
}

export async function confirm({
  title = 'Are you sure?',
  text = '',
  confirmButtonText = 'Yes',
  cancelButtonText = 'Cancel',
  confirmButtonColor = '#3b82f6',
  cancelButtonColor = '#d1d5db',
  icon = 'question',
} = {}) {
  const res = await ReactSwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor,
    cancelButtonColor,
    reverseButtons: true,
  });
  return res.isConfirmed;
}

export async function alertError(title = 'Something went wrong', text = '') {
  return ReactSwal.fire({ icon: 'error', title, text });
}

export async function alertSuccess(title = 'Success', text = '') {
  return ReactSwal.fire({ icon: 'success', title, text });
}

export async function alertWarning(title = 'Warning', text = '') {
  return ReactSwal.fire({ icon: 'warning', title, text });
}

export async function alertInfo(title = 'Info', text = '') {
  return ReactSwal.fire({ icon: 'info', title, text });
}
