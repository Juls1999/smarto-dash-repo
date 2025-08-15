$(document).ready(function () {
  // Get article_id from the URL
  const params = new URLSearchParams(window.location.search);
  const article_id = params.get("article_id");

  if (!article_id) {
    $(".kb-container").html(`<p class="info-message">No article selected.</p>`);
    return;
  }

  // Call backend to get the article data
  $.get(
    `../../../operations/view-article.php?article_id=${encodeURIComponent(
      article_id
    )}`,
    function (response) {
      if (response.status === "error") {
        $(".kb-container").html(
          `<p class="info-message">${response.message}</p>`
        );
        return;
      }

      if (!response || Object.keys(response).length === 0) {
        $(".kb-container").html(
          `<p class="info-message">Article not found.</p>`
        );
        return;
      }

      // Render article data
      $(".kb-container").html(`
        <h1>${response.name}</h1>
         <p>${response.content}</p>
        <div class="button-container">
          <button class="delete-button" id="delete-btn" data-id="${response.id}" data-name="${response.name}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
              <path fill="currentColor"
                d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z" />
            </svg>
            <span>Delete</span>
          </button>
          <button class="edit-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path fill="currentColor"
                d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1 0 32c0 8.8 7.2 16 16 16l32 0zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
            </svg>
            <span>Edit</span>
          </button>
        </div>
      `);
    },
    "json"
  );

  // BACK
  $(document).on("click", "#back-link", function (e) {
    e.preventDefault();

    if (
      document.referrer &&
      document.referrer.startsWith(window.location.origin)
    ) {
      // Previous page exists and is on the same site
      window.history.back();
    } else {
      // Fallback to a default page
      window.location.href = "/kb-figma/knowledgebase/knowledgebase";
    }
  });

  // DELETE
  $(document).on("click", "#delete-btn", function () {
    const id = $(this).data("id");
    const name = $(this).data("name");

    Swal.fire({
      title: "Confirm Deletion",
      html: `
    <p style="margin:0">Type <strong>DELETE</strong> to confirm removing <strong>${name}</strong>.</p>
    <input id="confirmInput" class="swal2-input" placeholder="Type DELETE here" autocomplete="off">
    <small><span style="color:red">Important notice</span>: all articles under this category will also be deleted</small>
  `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      focusConfirm: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        confirmButton: "swal-btn-cancel",
        cancelButton: "swal-btn-confirm",
      },
      willOpen: () => {
        document.body.style.overflow = "hidden"; // prevent scroll
      },
      willClose: () => {
        document.body.style.overflow = ""; // restore scroll
      },
      preConfirm: () => {
        const value = document.getElementById("confirmInput").value.trim();
        if (value !== "DELETE") {
          Swal.showValidationMessage("You must type DELETE to confirm.");
          return false;
        }
        return true;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          url: "../../../operations/delete-article.php",
          method: "POST",
          dataType: "json", // ✅ make sure JSON is parsed
          data: { id: id },
          success: function (response) {
            if (response.status === "success") {
              Swal.fire({
                icon: "success",
                title: "Category Deleted Successfully!",
                text: response.message,
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                didClose: () => {
                  location.reload();
                },
              });
            } else {
              Swal.fire({
                icon: "error",
                title: "Error",
                text: response.message || "Something went wrong.",
              });
            }
          },
          error: function () {
            Swal.fire({
              icon: "error",
              title: "Server Error",
              text: "Unable to delete category at the moment.",
            });
          },
        });
      }
    });
  });
});
