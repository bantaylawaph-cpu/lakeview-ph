import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const ReactSwal = withReactContent(Swal);

// Shared custom classes so we can style SweetAlert2 via CSS (rounded corners, z-index, etc.)
const customClass = {
  container: 'swal-container',
  popup: 'swal-popup',
  title: 'swal-title',
  htmlContainer: 'swal-text',
  confirmButton: 'swal-confirm',
  cancelButton: 'swal-cancel',
  denyButton: 'swal-confirm', // match confirm styling for consistent look
};

export const Toast = ReactSwal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass,
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
    customClass,
  });
  return res.isConfirmed;
}

export async function alertError(title = 'Something went wrong', text = '') {
  return ReactSwal.fire({ icon: 'error', title, text, customClass });
}

export async function alertSuccess(title = 'Success', text = '') {
  return ReactSwal.fire({ icon: 'success', title, text, customClass });
}

export async function alertWarning(title = 'Warning', text = '') {
  return ReactSwal.fire({ icon: 'warning', title, text, customClass });
}

export async function alertInfo(title = 'Info', text = '') {
  return ReactSwal.fire({ icon: 'info', title, text, customClass });
}

// Show a blocking loading modal; caller should call closeLoading() when done
export async function showLoading(title = 'Loading', text = 'Please wait...') {
  return ReactSwal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      ReactSwal.showLoading();
    },
    customClass,
  });
}

export function closeLoading() {
  try { ReactSwal.close(); } catch {}
}

// Prompt user to choose a download format (GeoJSON or KML). Returns 'geojson' | 'kml' | null
export async function promptDownloadFormat({
  title = 'Download Watershed',
  text = 'Choose a format to download',
  confirmText = 'GeoJSON',
  denyText = 'KML',
} = {}) {
  const res = await ReactSwal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: confirmText,
    denyButtonText: denyText,
    // unify button appearance while allowing distinct colors
    confirmButtonColor: '#6366f1', // indigo
    denyButtonColor: '#ef4444',    // red
    cancelButtonColor: '#6b7280',  // gray
    customClass,
  });
  if (res.isConfirmed) return 'geojson';
  if (res.isDenied) return 'kml';
  return null;
}
