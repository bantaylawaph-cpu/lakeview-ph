// resources/js/utils/alerts.js
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export const alertSuccess = (title, text) =>
  MySwal.fire({ icon: "success", title, text, timer: 1800, showConfirmButton: false });

export const alertError = (title, text) =>
  MySwal.fire({ icon: "error", title, text });

export const alertInfo = (title, text) =>
  MySwal.fire({ icon: "info", title, text });

export const confirm = async (title, text, confirmButtonText = "Yes") => {
  const res = await MySwal.fire({
    icon: "question",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    reverseButtons: true,
    focusCancel: true,
  });
  return res.isConfirmed;
};
