$(document).ready(function () {
  toastr.options = {
    closeButton: true, // Show close (X) button
    debug: false,
    newestOnTop: true,
    progressBar: true, // Show a timer/progress bar
    positionClass: "toast-top-right",
    preventDuplicates: true,
    onclick: null,
    showDuration: "300", // fadeIn duration in ms
    hideDuration: "1000", // fadeOut duration in ms
    timeOut: "5000", // Auto-dismiss after 5 seconds
    extendedTimeOut: "1000", // When mouse hovers, extend timer
    showEasing: "swing", // jQuery easing
    hideEasing: "linear",
    showMethod: "fadeIn", // Animation method
    hideMethod: "fadeOut",
  };

  // Fetch the data from your custom endpoint
  $.ajax({
    url: "../../operations/list-articles.php",
    method: "POST",
    dataType: "json",
    success: function (response) {
      $(".kb-container").empty();

      response.forEach(function (item, index) {
        const limitedArticles = item.article.slice(0, 3);

        // Instead of truncating content, we just use article titles
        const articleTitles = limitedArticles.map(function (articleItem) {
          return articleItem.article_title;
        });

        let cardHtml = `
        <div class="kb-card">
          <div class="card-header">
            <h3 id="title">${item.title}</h3>
             <svg class="color-gray ellipsis-icon" xmlns="http://www.w3.org/2000/svg" width="21" height="5" viewBox="0 0 21 5" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5 2.5C5 3.88071 3.88071 5 2.5 5C1.11929 5 0 3.88071 0 2.5C0 1.11929 1.11929 0 2.5 0C3.88071 0 5 1.11929 5 2.5ZM13 2.5C13 3.88071 11.8807 5 10.5 5C9.11929 5 8 3.88071 8 2.5C8 1.11929 9.11929 0 10.5 0C11.8807 0 13 1.11929 13 2.5ZM18.5 5C19.8807 5 21 3.88071 21 2.5C21 1.11929 19.8807 0 18.5 0C17.1193 0 16 1.11929 16 2.5C16 3.88071 17.1193 5 18.5 5Z" fill="currentColor"/>
          </svg>
           <div class="article-menu">
            <div class="add-article"
             data-id="${item.category_id}">Add Article</div>
            <div class="edit-category"
             data-id="${item.category_id}"
             data-name="${item.title}"
            data-desc="${item.subtitle}">Edit Category</div>
            <div class="delete-category" 
            data-id="${item.category_id}"
            data-name="${item.title}"
            >Delete Category</div>
          </div>
          </div>
          <p id="subtitle">${item.subtitle}</p>
          <ul>
            ${articleTitles
              .map((title) => `<li id="content">${title}</li>`)
              .join("")}
          </ul>
          ${
            item.article.length > 0
              ? `<div class="see-articles" id="show-articles-btn" data-index="${index}" data-id="${item.category_id}"><span>See All ${item.article.length} Articles</span></div>`
              : `<p class="info-message">No solution Created</p>`
          }
        </div>
      `;

        $(".kb-container").append(cardHtml);
      });
    },
    error: function (xhr, status, error) {
      console.error("Error fetching data:", error);
    },
  });

  // Event listeners for other functionality
  $(document).on("click", ".ellipsis-icon", function () {
    $(this).closest(".kb-card").find(".article-menu").toggle();
  });

  $(".kb-container").on("mouseleave", ".kb-card", function () {
    $(this).find(".article-menu").hide();
  });

  let originalCategory = "";

  // EDIT
  $(document).on("click", ".edit-category", function () {
    $("body").css("overflow", "hidden"); // Disable scroll

    // Get data from the clicked button
    originalCategory = $(this).data("name"); // store original
    let id = $(this).data("id");
    let name = $(this).data("name");
    let desc = $(this).data("desc");

    // Fill modal fields
    $("#edit-category-id").val(id);
    $("#edit-category-name").val(name);
    $("#edit-category-desc").val(desc);

    // Show modal
    $("#editCategoryModal").fadeIn();

    // SAVE EDIT — prevent duplicate bindings
    $(document)
      .off("click", "#save-edit-btn")
      .on("click", "#save-edit-btn", function () {
        // Get latest values from the modal input fields
        let updatedId = $("#edit-category-id").val();
        let updatedCategory = $("#edit-category-name").val().trim();
        let updatedDesc = $("#edit-category-desc").val().trim();

        if (updatedCategory === "" || updatedDesc === "") {
          toastr.warning("Please fill out all fields");
          return;
        }

        Swal.fire({
          icon: "question",
          allowOutsideClick: false,
          allowEscapeKey: false,
          title: "Action Confirmation",
          html: `<p style="margin:0">Are you sure you want to edit <strong>${originalCategory}</strong>?</p>`,
          confirmButtonText: "Yes, Edit it!",
          showCancelButton: true,
          cancelButtonText: "Cancel",
          customClass: {
            confirmButton: "swal-btn-confirm",
            cancelButton: "swal-btn-cancel",
          },
        }).then((result) => {
          if (result.isConfirmed) {
            $.ajax({
              url: "../../operations/save-article-category.php",
              method: "POST",
              data: {
                id: updatedId,
                name: updatedCategory,
                desc: updatedDesc,
              },
              success: function (response) {
                if (response.status === "success") {
                  $(".modal-content").hide();

                  Swal.fire({
                    icon: "success",
                    title: "Category Updated Successfully!",
                    text: "The category has been updated in the system.",
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
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    title: "Failed to Update Category!",
                    text: response.message,
                    confirmButtonText: "OK",
                  });
                }
              },
            });
          }
        });
      });
  });

  // CANCEL EDIT
  $(document).on("click", "#cancel-edit-btn", function () {
    $("body").css("overflow", "auto"); // Re-enable scroll
    $("#editCategoryModal").fadeOut();
  });

  // DELETE with confirmation
  $(document).on("click", ".delete-category", function () {
    let id = $(this).data("id"); // Grab the category ID
    let name = $(this).data("name"); // Grab the category ID

    Swal.fire({
      title: "Confirm Deletion",
      html: `
            <p style="margin:0">Type <strong>DELETE</strong> to confirm removing <strong>${name}</strong>.</p>
            <input id="confirmInput" class="swal2-input" placeholder="Type DELETE here" autocomplete="off">
            <small><span style="color:red">important notice</span>: all articles under this category will also be deleted </small>
        `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      focusConfirm: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      reverseButtons: true,
      customClass: {
        confirmButton: "swal-btn-cancel",
        cancelButton: "swal-btn-confirm",
      },
      willOpen: () => {
        // Prevent background scrolling
        document.body.style.overflow = "hidden";
      },
      willClose: () => {
        // Restore scrolling after close
        document.body.style.overflow = "";
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
        // User typed DELETE and clicked confirm
        $.ajax({
          url: "../../operations/delete-article-category.php",
          method: "POST",
          data: { id: id },
          dataType: "json",
          success: function (response) {
            if (response.status === "success") {
              $(".modal-content").hide();

              Swal.fire({
                icon: "success",
                title: "Category Deleted Successfully!",
                text: "The category has been removed from the system.",
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
                allowOutsideClick: false,
                allowEscapeKey: false,
                title: "Failed to Delete Category!",
                text: response.message,
                confirmButtonText: "OK",
              });
            }
          },
          error: function () {
            Swal.fire({
              icon: "error",
              title: "Request Failed",
              text: "Could not communicate with the server.",
              confirmButtonText: "OK",
            });
          },
        });
      }
    });
  });

  // Add Article
  $(document).on("click", ".add-article", function () {
    const categoryId = $(this).data("id"); // read from data-id attribute
    window.location.href = `add-article/?category_id=${encodeURIComponent(
      categoryId
    )}`;
  });

  // Add event listener to "See All Articles" links
  $(".see-articles").on("click", function () {
    const index = $(this).data("index"); // Get the index from the clicked element
    console.log(index); // Debug the index value
    if (index !== undefined && kb_data[index]) {
      // Ensure index is valid
      const fullArticles = kb_data[index].article; // Access the full list of articles using the index

      // Check if the fullArticles array is defined before storing in sessionStorage
      if (fullArticles) {
        sessionStorage.setItem(
          "editCardData",
          JSON.stringify({
            title: kb_data[index].title,
            subtitle: kb_data[index].subtitle,
            articles: fullArticles.map((article) => article.content), // Store only the article content
          })
        );

        // Redirect to the all-articles page
        window.location.href = "all-articles.php";
      } else {
        console.error("Full articles not found for this index.");
      }
    } else {
      console.error("Invalid index:", index);
    }
  });

  // Open modal and disable scroll
  $("#add-category-btn").on("click", function () {
    $("body").css("overflow", "hidden"); // Disable scroll
    $("#addCategoryModal").fadeIn();
  });

  // Close modal and re-enable scroll
  $("#cancel-btn").on("click", function () {
    $("#addCategoryModal").fadeOut();
    $("body").css("overflow", "auto"); // Re-enable scroll
    setTimeout(function () {
      $("#add-category").val("");
    }, 500);
  });

  // CREATE CATEGORY CLICK HANDLER
  $("#create-btn").click(function () {
    let category = $("#add-category").val().trim();
    let desc = $("#article-description").val().trim();

    if (desc === "" && category === "") {
      toastr.warning("Empty Description and Article Category!");
      return;
    }

    if (desc === "") {
      toastr.warning("Empty Description!");
      return;
    }

    if (category === "") {
      toastr.warning("Empty Article Category!");
      return;
    } else {
      Swal.fire({
        icon: "question",
        allowOutsideClick: false,
        allowEscapeKey: false,
        title: "Action Confirmation",
        text: "Are you sure you want to add this Category?",
        confirmButtonText: "OK",
        showCancelButton: true,
        cancelButtonText: "Cancel",
        customClass: {
          confirmButton: "swal-btn-confirm",
          cancelButton: "swal-btn-cancel",
        },
      }).then((result) => {
        if (result.isConfirmed) {
          $.ajax({
            url: "../../operations/add-article-category.php",
            method: "POST",
            data: { category: category, desc: desc },
            success: function (response) {
              if (response.status === "success") {
                $(".modal-content").hide();

                Swal.fire({
                  icon: "success",
                  title: "Category Added Successfully!",
                  text: "The category has been added to the system.",
                  timer: 3000, // 3 seconds
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
                  allowOutsideClick: false,
                  allowEscapeKey: false,
                  title: "Failed to Add Category!",
                  text: response.message,
                  confirmButtonText: "OK",
                });
              }
            },
          });
        }
      });
    }
  });

  // Reposition .add-category-container below .kb-container on mobile
  function repositionAddCategoryContainer() {
    const $addCategory = $(".add-category-container");
    const $kbContainer = $(".kb-container");
    const $headerContainer = $(".header-container");

    if (
      $(window).width() <= 768 &&
      $.contains($headerContainer[0], $addCategory[0])
    ) {
      $kbContainer.after($addCategory); // Move it below kb-container
    }

    // Optional: move it back when screen size increases
    if ($(window).width() > 768 && !$headerContainer.has($addCategory).length) {
      $headerContainer.append($addCategory); // Move it back to header
    }
  }

  // Call once when DOM is ready
  repositionAddCategoryContainer();

  // Re-run on window resize
  $(window).on("resize", repositionAddCategoryContainer);

  // SHOW ARTICLES LOGIC
  $(document).on("click", "#show-articles-btn", function () {
    const categoryId = $(this).data("id");

    const url = `show-articles/?category_id=${encodeURIComponent(categoryId)}`;
    window.location.href = url;
  });

  // Upload then Index the Files
  $("#index-btn").on("click", function () {
    
    Swal.fire({
      title: "Index all files?",
      text: "This will index all recently updated/crawled files.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, index all",
      cancelButtonText: "Cancel",
      allowOutsideClick: false,
      allowEscapeKey: false,
      reverseButtons: true,
      customClass: {
        container: "my-swal-font",
        confirmButton: "swal-btn-confirm",
        cancelButton: "swal-btn-cancel",
      },
    }).then((result) => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: "Indexing...",
        html: "Please wait while all files are being indexed.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
          container: "my-swal-font",
        },
        didOpen: () => {
          Swal.showLoading();

          $("#uploadStatus").text("⏳ Indexing...");

          $.ajax({
            url: "../../operations/index-articles.php",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({}),
            success: function (res) {
              const uploaded = Array.isArray(res.uploaded) ? res.uploaded : [];
              const uploadedCount = uploaded.length;

              // Only call start_index.php if files were uploaded
              if (uploadedCount) {
                const domain = $("#uploadFilesBtn").data("domain");

                $.ajax({
                  url: "../../api/start_index.php",
                  method: "POST",
                  contentType: "application/json",
                  data: JSON.stringify({ domain }),
                  success: function () {
                    Swal.fire({
                      icon: "success",
                      allowOutsideClick: false,
                      allowEscapeKey: false,
                      title: "Index Complete!",
                      text: `The changes might take some time to take effect.`,
                      confirmButtonText: "OK",
                      customClass: {
                        container: "my-swal-font",
                        confirmButton: "swal-btn-confirm",
                      },
                    }).then(() => {
                      location.reload(); // Reload the page after clicking "OK"
                    });
                  },
                  error: function (xhr) {
                    const err =
                      xhr.responseJSON?.error || "Failed to start indexing.";
                    toastr.error(err);
                  },
                });
              } else {
                Swal.fire({
                  icon: "error",
                  title: "Nothing to index",
                  html: "No files were recently updated/crawled, so nothing was indexed.",
                  confirmButtonText: "OK",
                  allowOutsideClick: false,
                  allowEscapeKey: false,
                  customClass: {
                    container: "my-swal-font",
                    confirmButton: "swal-btn-confirm",
                  },
                });
              }
            },
            error: function (xhr) {
              Swal.fire({
                icon: "error",
                title: "Upload Failed",
                text: xhr.responseJSON?.error || "An error occurred.",
                customClass: {
                  container: "my-swal-font",
                },
              });
            },
            complete: function () {
              $("#uploadStatus").text("");
            },
          });
        },
      });
    });
  });
});
