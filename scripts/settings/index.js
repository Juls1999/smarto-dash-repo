$(document).ready(function () {
  toastr.options = {
    closeButton: true,
    debug: false,
    newestOnTop: true,
    progressBar: true,
    positionClass: "toast-top-right",
    preventDuplicates: true,
    onclick: null,
    showDuration: "300",
    hideDuration: "1000",
    timeOut: "5000",
    extendedTimeOut: "1000",
    showEasing: "swing",
    hideEasing: "linear",
    showMethod: "fadeIn",
    hideMethod: "fadeOut",
  };

  $("#settingsForm").on("submit", function (e) {
    e.preventDefault();

    // Sync slider values with number inputs
    $("#temperatureRange").val($("#temperatureInput").val());
    $("#top_pRange").val($("#top_pInput").val());
    $("#kRange").val($("#kInput").val());
    $("#freqPenaltyRange").val($("#freqPenaltyInput").val());

    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to save these AI settings?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, save it!",
      cancelButtonText: "Cancel",
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        title: "swal-custom-title",
        popup: "swal-custom-popup",
        htmlContainer: "swal-custom-text",
        confirmButton: "swal-confirm-button",
        cancelButton: "swal-cancel-button",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const formData = new FormData($("#settingsForm")[0]);

        $.ajax({
          url: "../operations/save-settings.php", // Make sure this path is correct
          type: "POST",
          data: formData,
          processData: false,
          contentType: false,
          success: function () {
            Swal.fire({
              icon: "success",
              title: "Settings updated successfully!",
              confirmButtonText: "OK",
              allowOutsideClick: false,
              allowEscapeKey: false,
              customClass: {
                title: "swal-custom-title",
                popup: "swal-custom-popup",
                htmlContainer: "swal-custom-text",
                confirmButton: "swal-confirm-button",
              },
            }).then(() => {
              location.reload();
            });
          },
          error: function (xhr) {
            Swal.fire({
              icon: "error",
              title: "Failed to save settings",
              text: xhr.responseText || "Something went wrong",
            });
          },
        });
      }
    });
  });

  // Sync sliders and inputs in real time
  function syncSlider(rangeId, inputId) {
    const range = document.getElementById(rangeId);
    const input = document.getElementById(inputId);
    range.addEventListener("input", () => (input.value = range.value));
    input.addEventListener("input", () => (range.value = input.value));
  }

  syncSlider("temperatureRange", "temperatureInput");
  syncSlider("top_pRange", "top_pInput");
  syncSlider("kRange", "kInput");
  syncSlider("freqPenaltyRange", "freqPenaltyInput");

  // Dropdown functionality
  function toggleDropdown() {
    const menu = document.getElementById("dropdownMenu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  }

  document.querySelectorAll("#dropdownMenu div").forEach((option) => {
    option.addEventListener("click", function () {
      document.querySelector(".dropdown-button").textContent = this.textContent
        .split("–")[0]
        .trim();
      document.getElementById("retrievalMethodInput").value =
        this.getAttribute("data-value");
      toggleDropdown();
    });
  });

  document
    .querySelector(".dropdown-button")
    .addEventListener("click", toggleDropdown);

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".dropdown")) {
      document.getElementById("dropdownMenu").style.display = "none";
    }
  });
});
