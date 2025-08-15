function CustomUploadAdapterPlugin(editor) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader) => {
    return new MyUploadAdapter(loader);
  };
}

class MyUploadAdapter {
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then((file) => {
      const data = new FormData();
      data.append("upload", file);

      return fetch("/kb-figma/api/upload_image.php", {
        method: "POST",
        body: data,
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.url) {
            return Promise.reject(res.error || "Upload failed");
          }
          return {
            default: res.url,
          };
        });
    });
  }

  abort() {
    // Optional
  }
}

// START
function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

$(document).ready(function () {
  const domain = getQueryParam("domain");

  if (!domain) {
    $(".kb-container").html("<p class='info-message'>No domain specified.</p>");
    return;
  }

  function cleanFileName(filePath) {
    const filename = filePath.split("/").pop();
    const decoded = decodeURIComponent(filename);
    const noExt = decoded.replace(/\.txt$/i, "");
    const parts = noExt.split("-");
    if (/^\d+$/.test(parts[0])) parts.shift();
    const readable = parts.join(" ");
    return readable.charAt(0).toUpperCase() + readable.slice(1);
  }

  function generateSkeletonCards(count = 5) {
    let skeletons = "";
    for (let i = 0; i < count; i++) {
      skeletons += `
        <div class="skeleton-card">
          <div class="skeleton-title"></div>
          <div class="skeleton-text skeleton-paragraph"></div>
        </div>
      `;
    }
    return skeletons;
  }

  $(".kb-container").html(generateSkeletonCards(5));

  // Initial header skeleton
  $("header").html(`
    <p class="header-skeleton-title"></p>
    <p class="header-skeleton-subtitle"></p>
  `);

  let allFiles = []; // Will hold file objects

  $.get(
    `../../../api/list_files.php?domain=${encodeURIComponent(domain)}`,
    function (response) {
      const files = response.files || [];

      if (files.length === 0) {
        $(".kb-container").html(
          `<p class="info-message">No files found for domain <strong>${domain}</strong>.</p>`
        );
        return;
      }

      allFiles = files;

      function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString(); // You can format this differently if needed
      }

      function renderCards(limit, filtered = allFiles) {
        const statusPriority = {
          not_indexed: 3,
          edited: 2,
          indexed: 1,
        };

        const sorted = filtered.slice().sort((a, b) => {
          const aStatus = (a.status || "").toLowerCase();
          const bStatus = (b.status || "").toLowerCase();
          return (
            (statusPriority[bStatus] || 0) - (statusPriority[aStatus] || 0)
          );
        });

        const html = sorted
          .slice(0, limit)
          .map((file, index) => {
            const readableName = cleanFileName(file.file_name || file.name);
            const status = (file.status || "").toLowerCase();
            const uploadedAt = file.uploaded_at
              ? formatDate(file.uploaded_at)
              : "N/A";

            const statusClassMap = {
              indexed: "text-success",
              edited: "text-warning",
              not_indexed: "text-error",
            };

            const statusClass = statusClassMap[status] || "";

            return `
      <div class="kb-card ${statusClass}" data-id="${
              file.id || index
            }" data-name="${file.file_name}">
        <div class="card-header">
          <h3>${readableName}</h3>
          <svg class="color-gray ellipsis-icon" xmlns="http://www.w3.org/2000/svg" width="21" height="5" viewBox="0 0 21 5" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5 2.5C5 3.88071 3.88071 5 2.5 5C1.11929 5 0 3.88071 0 2.5C0 1.11929 1.11929 0 2.5 0C3.88071 0 5 1.11929 5 2.5ZM13 2.5C13 3.88071 11.8807 5 10.5 5C9.11929 5 8 3.88071 8 2.5C8 1.11929 9.11929 0 10.5 0C11.8807 0 13 1.11929 13 2.5ZM18.5 5C19.8807 5 21 3.88071 21 2.5C21 1.11929 19.8807 0 18.5 0C17.1193 0 16 1.11929 16 2.5C16 3.88071 17.1193 5 18.5 5Z" fill="currentColor"/>
          </svg>
          <div class="article-menu">
            <div class="view-article" data-domain="${domain}">View Article</div>
            <div class="edit-article" data-domain="${domain}">Edit Article</div>
          </div>
        </div>
        <div class="card-body">
          <p><strong>Last Indexed:</strong> ${uploadedAt}</p>
          <p><strong>Status:</strong> ${file.status}</p>
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
      let currentLimit = parseInt($("#card-limit").val(), 10);
      renderCards(currentLimit);

      $("#card-limit").on("change", function () {
        const selectedVal = $(this).val();
        if (selectedVal === "all") {
          currentLimit = allFiles.length;
        } else {
          currentLimit = parseInt(selectedVal, 10);
        }
        applySearch();
      });

      function applySearch() {
        const query = $("#file-search").val().toLowerCase().trim();
        const filtered = allFiles.filter((file) =>
          cleanFileName(file.file_name || file.name)
            .toLowerCase()
            .includes(query)
        );
        renderCards(currentLimit, filtered);
      }

      $("#file-search").on("input", applySearch);

      $("header").html(`
      <h1>${domain}</h1>
      <p>Help us improve to make your life easier</p>
    `);
    }
  ).fail(function () {
    $(".kb-container").html(
      `<p class="info-message">Error fetching data for domain <strong>${domain}</strong>.</p>`
    );
  });

  // Toggle article menu
  $(document).on("click", ".ellipsis-icon", function () {
    $(this).closest(".kb-card").find(".article-menu").toggleClass("show");
  });

  // Hide menu when mouse leaves
  $(document).on("mouseleave", ".kb-card", function () {
    $(this).find(".article-menu").removeClass("show");
  });

  // View Article
  $(document).on("click", ".view-article", function () {
    const fileId = $(this).closest(".kb-card").data("id");
    const fileName = $(this).closest(".kb-card").data("name");
    const file = allFiles.find((f) => f.file_name === fileName);

    if (!file) {
      console.log("File data not found.");
      return;
    }

    const readableName = cleanFileName(file.file_name);
    const status = (file.status || "Unknown").toLowerCase();
    const uploadedAt = file.uploaded_at
      ? new Date(file.uploaded_at).toLocaleString()
      : "Not available";

    const statusClassMap = {
      indexed: "text-success",
      edited: "text-warning",
      not_indexed: "text-error",
    };

    const statusClass = statusClassMap[status] || "";

    // ✅ Show SweetAlert loading spinner
    Swal.fire({
      title: "Loading article...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
      customClass: {
        container: "my-swal-font",
      },
    });

    // 🔽 Fetch full article content
    $.getJSON(`/kb-figma/api/file.php?id=${fileId}`)
      .done(function (data) {
        Swal.close(); // ✅ Close the loading modal

        const html = data.raw_html || "<p><em>No content available.</em></p>";

        // ✅ Populate modal content
        $("#article-modal .modal-title").text(readableName);
        $("#article-modal .modal-body").html(html);

        // ✅ Delay scroll reset
        setTimeout(() => {
          $("#article-modal .modal-body").scrollTop(0);
        }, 10);

        $("#article-modal .file-status")
          .removeClass("text-success text-warning text-error")
          .addClass(statusClass)
          .text(`Status: ${status}`);
        $("#article-modal .file-crawled").text(`Indexed at: ${uploadedAt}`);

        // ✅ Show modal
        $("body").css("overflow", "hidden");
        $("#article-modal").addClass("show").fadeIn();
      })
      .fail(function () {
        Swal.close();
        toastr.error("Failed to load full article content.");
      });
  });

  // EDIT ARTICLE
  let isEditorLoading = false;
  let editorInstance = null; // Declare globally so it persists

  $(document).on("click", ".edit-article", function () {
    // If editor already exists, destroy it first
    if (editorInstance) {
      editorInstance.destroy().then(() => {
        editorInstance = null;
        initEditorAndLoadData($(this));
      });
    } else {
      initEditorAndLoadData($(this));
    }
  });

  function initEditorAndLoadData($triggerElement) {
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
      MediaEmbed,
      WordCount,
    } = CKEDITOR;

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
        "ImageInsert",
        "mediaEmbed",
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
        previewsInData: true,
      },
      wordCount: {
        showWordCount: true,
        showCharCount: false,
        wordCountContainer: "#word-count",
      },
    })
      .then((editor) => {
        editorInstance = editor;

        editor.model.document.on("change:data", () => {
          const wordCountPlugin = editor.plugins.get("WordCount");
          $("#word-count").text(`${wordCountPlugin.words} words`);
        });

        loadFileData($triggerElement, editor);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function loadFileData($triggerElement, editor) {
    $("body").css("overflow", "hidden");
    isEditorLoading = true;
    const fileId = $triggerElement.closest(".kb-card").data("id");

    Swal.fire({
      title: "Preparing file editor...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      customClass: { container: "my-swal-font" },
    });

    $.getJSON(`/kb-figma/api/file.php?id=${fileId}`)
      .done((data) => {
        editor.setData(data.raw_html || "");
        $("#saveEditBtn").data("file-id", fileId).data("original-json", data);
        $("#editModal").removeClass("hidden").show();
      })
      .fail(() => {
        toastr.error("Failed to load content for editing.");
      })
      .always(() => {
        Swal.close();
        isEditorLoading = false;
      });
  }

  // Cancel Edit
  $(document).on("click", "#cancelEditBtn", function () {
    $("#editModal").addClass("hidden").hide();
    $("#editTextarea").val("");
    $("body").css("overflow", "");
    currentEditingFile = null;
  });

  function removeFacebookImages(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const images = tempDiv.querySelectorAll("img");
    images.forEach((img) => {
      if (img.src.includes("scontent.") && img.src.includes("fbcdn.net")) {
        img.remove();
      }
    });

    return tempDiv.innerHTML;
  }

  // Save Edited Article
  $(document).on("click", "#saveEditBtn", function () {
    const fileId = $(this).data("file-id");
    // const fullData = $(this).data("original-json");
    const rawHtml = editorInstance.getData().trim();

    // ✅ Sanitize HTML to remove Facebook images
    const cleanedHtml = removeFacebookImages(rawHtml);

    const turndownService = new TurndownService({ headingStyle: "atx" });
    const markdown = turndownService.turndown(cleanedHtml).trim();

    if (!fileId || !markdown) {
      toastr.error("Missing file ID or content.");
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
      reverseButtons: true,
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

      const updatedContent = {
        raw_html: cleanedHtml,
        plain_text: markdown,
      };

      $.ajax({
        url: `/kb-figma/api/update_data_source.php?id=${fileId}`,
        method: "PUT",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({
          format: "text",
          content: updatedContent,
        }),
        success: function (response) {
          if (response.success) {
            $("#editModal").addClass("hidden").hide();
            $("#editTextarea").val("");
            $("body").css("overflow", "");

            if (response.changed) {
              Swal.fire({
                icon: "success",
                title: "Saved!",
                allowOutsideClick: false,
                allowEscapeKey: false,
                text: "Content updated successfully.",
                confirmButtonText: "OK",
                customClass: {
                  confirmButton: "swal-btn-confirm",
                },
              }).then(() => {
                location.reload();
              });
            } else {
              Swal.fire({
                icon: "info",
                title: "No Changes",
                allowOutsideClick: false,
                allowEscapeKey: false,
                text: `${response.message}`,
                confirmButtonText: "OK",
                customClass: {
                  confirmButton: "swal-btn-confirm",
                },
              });
            }
          } else {
            console.log(response.success);
            Swal.fire({
              icon: "error",
              title: "Failed!",
              allowOutsideClick: false,
              allowEscapeKey: false,
              text: `${response.message}`,
              confirmButtonText: "OK",
              customClass: {
                confirmButton: "swal-btn-confirm",
              },
            });
          }
        },
        error: function () {
          toastr.error("Failed to update content.");
        },
        complete: function () {
          $.getJSON(`/kb-figma/api/file.php?id=${fileId}`, function (data) {
            const updatedHtml =
              data.raw_html || (data.plain_text || "").replace(/\n+/g, "\n\n");

            $("#article-modal .modal-body").html(updatedHtml);
            $("#modalHash").text(data.content_hash || "N/A");

            const uploaded = data.has_uploaded;
            const edited = data.edited_since_upload;

            let statusLabel = "";

            if (!uploaded) {
              statusLabel = '<span class="text-yellow-600">Not Indexed</span>';
            } else if (edited) {
              statusLabel =
                '<span class="text-red-500">Edited since Indexed</span>';
            } else {
              statusLabel = '<span class="text-green-500">Indexed</span>';
            }

            $("#fileStatusLabel").html(statusLabel);
          }).fail(() => {
            toastr.error("Failed to refresh preview content.");
          });
        },
      });
    });
  });

  // Cancel / Close Modal
  $(document).on("click", "#cancelEditBtn", function () {
    $("#editModal").addClass("hidden");
    $("body").css("overflow", "");
    currentEditingFile = null;
  });

  // Close modal
  $(document).on("click", ".close-modal", function () {
    $("#seedUrl").val(""); // Clear seed URL input

    $("body").css("overflow", ""); // ✅ restores background scroll
    $("#article-modal").fadeOut();
    $("#edit-modal").fadeOut();
  });

  $("#file-search").on("focus", function () {
    $(this).data("placeholder", $(this).attr("placeholder"));
    $(this).attr("placeholder", "");
  });

  $("#file-search").on("blur", function () {
    $(this).attr("placeholder", $(this).data("placeholder"));
  });
});
