const form = document.getElementById("asset-form");
const assetClassSelect = document.getElementById("asset-class");
const classSections = document.querySelectorAll(".class-fields");
const successNotice = document.getElementById("success-notice");

const toggleClassFields = () => {
  if (!assetClassSelect || !classSections.length) return;

  const selectedClass = assetClassSelect.value;
  classSections.forEach((section) => {
    const isActive = section.dataset.class === selectedClass;
    section.classList.toggle("active", isActive);

    section.querySelectorAll("input, select, textarea").forEach((field) => {
      field.required = false;
    });
  });
};

if (assetClassSelect) {
  assetClassSelect.addEventListener("change", toggleClassFields);
  toggleClassFields();
}

if (form && successNotice) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    successNotice.style.display = "block";
    form.reset();
    toggleClassFields();
  });
}
