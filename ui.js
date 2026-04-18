const form = document.getElementById("asset-form");
const successNotice = document.getElementById("success-notice");

if (form && successNotice) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    successNotice.style.display = "block";
    form.reset();
  });
}
