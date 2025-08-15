function CustomUploadAdapterPlugin(editor) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader) => {
    return new MyUploadAdapter(loader);
  };
}

// Initialize CKEditor on the textarea
const {
  ClassicEditor,
  Essentials,
  Bold,
  Italic,
  Font,
  Paragraph,
  Alignment,
  Heading,
  List,
  Indent,
  Image,
  ImageUpload,
  ImageInsert,
  PictureEditing,
  // Base64UploadAdapter,
  MediaEmbed,
  WordCount,
} = CKEDITOR;

let editorInstance = null;

ClassicEditor.create(document.querySelector("#editTextarea"), {
  licenseKey:
    "eyJhbGciOiJFUzI1NiJ9.eyJleHAiOjE3ODY1NzkxOTksImp0aSI6ImUxMzVjNTZjLTM0Y2EtNDg2OC04YmJlLTMyZWFlNmRhNjhiMiIsImxpY2Vuc2VkSG9zdHMiOlsiMTI3LjAuMC4xIiwibG9jYWxob3N0IiwiMTkyLjE2OC4qLioiLCIxMC4qLiouKiIsIjE3Mi4qLiouKiIsIioudGVzdCIsIioubG9jYWxob3N0IiwiKi5sb2NhbCJdLCJ1c2FnZUVuZHBvaW50IjoiaHR0cHM6Ly9wcm94eS1ldmVudC5ja2VkaXRvci5jb20iLCJkaXN0cmlidXRpb25DaGFubmVsIjpbImNsb3VkIiwiZHJ1cGFsIl0sImxpY2Vuc2VUeXBlIjoiZGV2ZWxvcG1lbnQiLCJmZWF0dXJlcyI6WyJEUlVQIiwiRTJQIiwiRTJXIl0sInZjIjoiOGU3NmFlOWQifQ.lWSK92-4v-JOEy5YXIK-ZbaUdrK4QPYGJvkcXVV2BtyaBimXm34P8PKq8WCuu8q06NE1XvYIMSNJgLdf-UbcXA", // Your license key
  extraPlugins: [CustomUploadAdapterPlugin],
  plugins: [
    Essentials,
    Bold,
    Italic,
    Font,
    Paragraph,
    Alignment,
    Heading,
    List,
    Indent,
    Image,
    ImageUpload,
    ImageInsert,
    PictureEditing,
    // Base64UploadAdapter,
    MediaEmbed,
    WordCount,
  ],
  toolbar: [
    "heading",
    "|",
    "bold",
    "italic",
    "|",
    "alignment:left",
    "alignment:right",
    "alignment:center",
    "alignment:justify",
    "|",
    "bulletedList",
    "numberedList",
    "|",
    "outdent",
    "indent",
    "ImageInsert", // Image upload button
    "mediaEmbed", // Media Embed button
    "|",
    "undo",
    "redo",
  ],
  image: {
    toolbar: [
      "imageTextAlternative",
      "|",
      "imageStyle:full",
      "imageStyle:side",
    ],
  },
  mediaEmbed: {
    previewsInData: true, // Preview media embed URL directly in the editor
  },
  wordCount: {
    showWordCount: true, // Only enable word count
    showCharCount: false, // Disable character count
    wordCountContainer: "#word-count", // Element for word count display
  },
})
  .then((editor) => {
    editorInstance = editor;

    // Listen for changes in the document
    editor.model.document.on("change:data", () => {
      // Get the word count plugin
      const wordCountPlugin = editor.plugins.get("WordCount");

      // Append the word count to the existing text
      $("#word-count").text(`${wordCountPlugin.words} words`);
    });
  })
  .catch((error) => {
    console.error(error);
  });

$(document).ready(function () {
  // 1️⃣ Get category_id from the URL
  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get("category_id");

  if (!categoryId) {
    $(".kb-container").html(
      `<p class="info-message">No category selected.</p>`
    );
    return;
  }

  $.get(
    `../../../operations/list-category-articles.php?category_id=${encodeURIComponent(
      categoryId
    )}`,
    function (response) {
      if (!response || response.length === 0) {
        $(".kb-container").html(
          `<p class="info-message">No category found for ID <strong>${categoryId}</strong>.</p>`
        );
        return;
      }

      // Get the first category object
      const category = response[0];
      const articles = category.article || [];

      if (articles.length === 0) {
        $(".kb-container").html(
          `<p class="info-message">No articles found in category <strong>${category.title}</strong>.</p>`
        );
        return;
      }

      // Render header with category info
      $("header").html(`
      <h1>${category.title}</h1>
      <p>${category.subtitle || ""}</p>
    `);

      // Render cards for articles
      function renderCards(limit, filtered = articles) {
        const html = filtered
          .slice(0, limit)
          .map((article, index) => {
            const statusClassMap = {
              indexed: "text-success",
              edited: "text-warning",
              not_indexed: "text-error",
            };

            const statusClass = statusClassMap[article.status] || "";

            return `
            <div class="kb-card ${statusClass}" data-id="${
              article.article_id || index
            }">
              <div class="card-header">
                <h3>${article.title}</h3>
                 <svg class="color-gray ellipsis-icon" xmlns="http://www.w3.org/2000/svg" width="21" height="5" viewBox="0 0 21 5" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5 2.5C5 3.88071 3.88071 5 2.5 5C1.11929 5 0 3.88071 0 2.5C0 1.11929 1.11929 0 2.5 0C3.88071 0 5 1.11929 5 2.5ZM13 2.5C13 3.88071 11.8807 5 10.5 5C9.11929 5 8 3.88071 8 2.5C8 1.11929 9.11929 0 10.5 0C11.8807 0 13 1.11929 13 2.5ZM18.5 5C19.8807 5 21 3.88071 21 2.5C21 1.11929 19.8807 0 18.5 0C17.1193 0 16 1.11929 16 2.5C16 3.88071 17.1193 5 18.5 5Z" fill="currentColor"/>
          </svg>
          <div class="article-menu">
            <div class="view-article" id="view-article-btn" 
            data-id="${article.article_id}" data-name="${
              article.title
            }">View Article</div>
            <div class="edit-article" data-id="${
              article.article_id
            }">Edit Article</div>
            <div class="delete-article" id="delete-btn" data-id="${
              article.article_id
            }" 
            data-name="${article.title}">Delete Article</div>
          </div>
              </div>
              <div class="card-body">
                <p><strong>Created at</strong>: ${article.created_at}</p>
                <p><strong>Status</strong>: ${article.status}</p>
              </div>
            </div>
          `;
          })
          .join("");

        $(".kb-container").html(html);

        const showing = Math.min(filtered.length, limit);
        $(".card-count-status").text(
          `Showing ${showing} out of ${filtered.length} entries`
        );
      }

      // Initial render
      let currentLimit =
        parseInt($("#card-limit").val(), 10) || articles.length;
      renderCards(currentLimit);

      // Search filter
      function applySearch() {
        const query = ($("#file-search").val() || "").toLowerCase().trim();
        const filtered = articles.filter((a) =>
          (a.title || "").toLowerCase().includes(query)
        );
        renderCards(currentLimit, filtered);
      }

      // Handle limit change
      $("#card-limit").on("change", function () {
        const selectedVal = $(this).val();
        currentLimit =
          selectedVal === "all" ? articles.length : parseInt(selectedVal, 10);
        applySearch();
      });

      $("#file-search").on("input", applySearch);
    }
  );

  // Toggle article menu
  $(document).on("click", ".ellipsis-icon", function () {
    $(this).closest(".kb-card").find(".article-menu").toggleClass("show");
  });

  // Hide menu when mouse leaves
  $(document).on("mouseleave", ".kb-card", function () {
    $(this).find(".article-menu").removeClass("show");
  });

  // View Article
  $(document).on("click", "#view-article-btn", function () {
    const article_id = $(this).data("id");

    $.ajax({
      url: "../../../operations/view-article.php",
      method: "get",
      data: { article_id: article_id },
      dataType: "json", // important so response is parsed
      success: function (response) {
        const statusClassMap = {
          indexed: "text-success",
          edited: "text-warning",
          not_indexed: "text-error",
        };

        const statusClass = statusClassMap[response.status] || "";

        // ✅ Populate modal content
        $("#article-modal .modal-title").text(response.name);
        $("#article-modal .modal-body").html(response.content);
        $("#article-modal .file-status")
          .removeClass("text-success text-warning text-error")
          .addClass(statusClass)
          .text(`Status: ${response.status}`);
        $("#article-modal .file-crawled").text(
          `Created at: ${response.created_at}`
        );

        // ✅ Show modal after closing Swal
        $("body").css("overflow", "hidden");
        $("#article-modal").addClass("show").fadeIn();
        $("#article-modal .modal-body").scrollTop(0);
      },
      error: function () {
        Swal.fire("Error", "Failed to load article.", "error");
      },
    });

    // ✅ Delay scroll reset
    setTimeout(() => {
      $("#article-modal .modal-body").scrollTop(0);
    }, 10);

    // ✅ Show modal
    $("body").css("overflow", "hidden");
    $("#article-modal").addClass("show").fadeIn();
  });

  // CLOSE VIEW MODAL
  $(document).on("click", "#close-modal-btn", function () {
    $("body").css("overflow", ""); // ✅ restores background scroll
    $("#article-modal").fadeOut();
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
    <small><span style="color:red">Important notice</span>: this action is irreversible</small>
  `,
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      confirmButtonText: "Delete",
      focusConfirm: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      reverseButtons: true,
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

  // EDIT ARTICLE
  let isEditorLoading = false;

  $(document).on("click", ".edit-article", function () {
    if (isEditorLoading) return;
    $("body").css("overflow", "hidden"); // disable background scroll

    isEditorLoading = true;
    const article_id = $(this).data("id");

    Swal.fire({
      title: "Preparing file editor...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      customClass: {
        container: "my-swal-font",
      },
    });

    $.ajax({
      url: `../../../operations/view-article.php`,
      type: "GET",
      data: { article_id: article_id },
      success: function (response) {
        if (!editorInstance) {
          Swal.close();
          toastr.error("Editor is not ready yet.");
          isEditorLoading = false;
          return;
        }

        editorInstance.setData(response.content || "");
        $("#saveEditBtn")
          .data("article_id", response.id)
          .data("original-json", response);
        $("#editModal").removeClass("hidden").show();
      },
      error: function () {
        toastr.error("Failed to load content for editing.");
      },
      complete: function () {
        Swal.close();
        isEditorLoading = false;
      },
    });
  });

  // Cancel Edit
  $(document).on("click", "#cancelEditBtn", function () {
    $("#editModal").addClass("hidden").hide();
    $("#editTextarea").val("");
    $("body").css("overflow", "");
    currentEditingFile = null;
  });

  // Save Edited Article
  $(document).on("click", "#saveEditBtn", function () {
    const article_id = $(this).data("article_id");
    // const fullData = $(this).data("original-json");
    const content = editorInstance.getData().trim();

    if (!article_id) {
      toastr.error("Missing article ID.");
      return;
    }

    $("#editModal").addClass("hidden").hide(); // ⬅️ Hide edit modal first

    Swal.fire({
      title: "Save changes?",
      text: "This will overwrite the previous version.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, save it",
      cancelButtonText: "Cancel",
      customClass: {
        container: "my-swal-font",
        confirmButton: "btn save",
        cancelButton: "btn cancel",
      },
      buttonsStyling: false,
    }).then((result) => {
      if (!result.isConfirmed) {
        // Show edit modal again if cancelled
        $("#editModal").removeClass("hidden").show();
        return;
      }

      $.ajax({
        url: `../../../operations/save-edited-article.php`,
        method: "post",
        data: { article_id: article_id, content: content },
        success: function (response) {
          if (response.status === "success") {
            $("#editModal").addClass("hidden").hide();
            $("#editTextarea").val("");
            $("body").css("overflow", "");

            Swal.fire({
              icon: "success",
              title: "Saved!",
              allowOutsideClick: false,
              allowEscapeKey: false,
              text: "Content updated successfully.",
              confirmButtonText: "OK",
            }).then(() => {
              location.reload();
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "Failed!",
              allowOutsideClick: false,
              allowEscapeKey: false,
              text: `${response.message}`,
              confirmButtonText: "OK",
            });
          }
        },
        error: function () {
          toastr.error("Failed to update content.");
        },
      });
    });
  });
});
