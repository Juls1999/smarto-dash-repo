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
    Base64UploadAdapter,
    MediaEmbed,
    WordCount,
  } = CKEDITOR;

  ClassicEditor.create(document.querySelector("#editor"), {
    licenseKey:
      "eyJhbGciOiJFUzI1NiJ9.eyJleHAiOjE3ODY1NzkxOTksImp0aSI6ImUxMzVjNTZjLTM0Y2EtNDg2OC04YmJlLTMyZWFlNmRhNjhiMiIsImxpY2Vuc2VkSG9zdHMiOlsiMTI3LjAuMC4xIiwibG9jYWxob3N0IiwiMTkyLjE2OC4qLioiLCIxMC4qLiouKiIsIjE3Mi4qLiouKiIsIioudGVzdCIsIioubG9jYWxob3N0IiwiKi5sb2NhbCJdLCJ1c2FnZUVuZHBvaW50IjoiaHR0cHM6Ly9wcm94eS1ldmVudC5ja2VkaXRvci5jb20iLCJkaXN0cmlidXRpb25DaGFubmVsIjpbImNsb3VkIiwiZHJ1cGFsIl0sImxpY2Vuc2VUeXBlIjoiZGV2ZWxvcG1lbnQiLCJmZWF0dXJlcyI6WyJEUlVQIiwiRTJQIiwiRTJXIl0sInZjIjoiOGU3NmFlOWQifQ.lWSK92-4v-JOEy5YXIK-ZbaUdrK4QPYGJvkcXVV2BtyaBimXm34P8PKq8WCuu8q06NE1XvYIMSNJgLdf-UbcXA", // Your license key
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
      Base64UploadAdapter,
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

  /////////////////////////////////////////////////////////////////

  // Cache elements
  const folderSelect = $(".custom-folder-select");
  const folderSelectBtn = $(".custom-folder-select-btn");
  const folderSelectOption = $(".custom-folder-select-option");

  // Toggle the dropdown when the button is clicked
  folderSelectBtn.on("click", function (event) {
    event.stopPropagation(); // Prevent event propagation to document click

    const $currentDropdown = $(this).closest(".custom-folder-select");

    // Check if the dropdown is already open
    const isOpen = $currentDropdown.hasClass("open");

    // Close all other dropdowns first
    $(".custom-folder-select").not($currentDropdown).removeClass("open");

    // Remove the clicked-border class from all buttons
    $(".custom-folder-select-btn").removeClass("clicked-border");

    // If the dropdown is not open, add the necessary classes
    if (!isOpen) {
      // Add the clicked-border class to the clicked button
      $(this).addClass("clicked-border");
    }

    // Toggle the dropdown (open/close)
    $currentDropdown.toggleClass("open");
  });

  // Option selection
  folderSelectOption.on("click", function () {
    const selectedText = $(this).text();
    $(this)
      .closest(".custom-folder-select")
      .find(".custom-folder-select-btn")
      .text(selectedText);
    $(this).closest(".custom-folder-select").removeClass("open");

    // Remove the clicked-border class from all buttons
    $(".custom-folder-select-btn").removeClass("clicked-border");
  });

  // Close the dropdown if clicked outside
  $(document).on("click", function (event) {
    if (!$(event.target).closest(folderSelect).length) {
      folderSelect.removeClass("open");
      $(".custom-folder-select-btn").removeClass("clicked-border");
    }
  });

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  const $customSelect = $(".custom-select");
  const $customSelectBtn = $(".custom-select-btn");
  const $customSelectOptions = $(".custom-select-options");
  const $customSelectOption = $(".custom-select-option");

  // Toggle the dropdown when the button is clicked
  $customSelectBtn.on("click", function (event) {
    event.stopPropagation(); // Prevent event propagation to document click

    // Get the current button's closest custom-select
    const $currentDropdown = $(this).closest(".custom-select");

    // Check if the dropdown is already open
    const isOpen = $currentDropdown.hasClass("open");

    // Close all other dropdowns first, and reset their icon visibility
    $(".custom-select")
      .not($currentDropdown)
      .each(function () {
        const $otherDropdown = $(this);
        // Reset the SVG icons for all other open dropdowns
        $otherDropdown.find(".collapse-down-topic").show(); // Show collapse-down for other dropdowns
        $otherDropdown.find(".collapse-up-topic").hide(); // Hide collapse-up for other dropdowns
        $otherDropdown.removeClass("open"); // Close all other dropdowns
      });

    // Remove "clicked" class from both Topic and Sub-Topic <p> elements
    $(".topic p").removeClass("clicked");
    $(".subtopic p").removeClass("clicked");

    // Remove the clicked-border class from all buttons
    $(".custom-select-btn").removeClass("clicked-border");

    // If the dropdown is not open, add the necessary classes
    if (!isOpen) {
      // Add "clicked" class to the <p> element of the parent topic or subtopic of the clicked button
      $(this).closest(".topic").find("p").addClass("clicked");
      $(this).closest(".subtopic").find("p").addClass("clicked");

      // Add the clicked-border class to the button
      $(this).addClass("clicked-border");
    }

    // Toggle the dropdown (open/close) for the current dropdown
    $currentDropdown.toggleClass("open");

    // Toggle the visibility of the collapse down/up icons for the current dropdown
    $(this).find(".collapse-down-topic").toggle(); // Toggle visibility of .collapse-down
    $(this).find(".collapse-up-topic").toggle(); // Toggle visibility of .collapse-up
  });

  // Option selection
  $customSelectOption.on("click", function () {
    // Toggle visibility of .collapse-down and .collapse-up icons
    $(".collapse-down-topic").toggle();
    $(".collapse-up-topic").toggle();

    const selectedText = $(this).text();

    // Update only the text part of the .custom-select-btn without affecting the SVG
    $(this)
      .closest(".custom-select")
      .find(".custom-select-btn .selected-text") // Target the span containing the text
      .text(selectedText); // Change the text only

    // Close the dropdown
    $(this).closest(".custom-select").removeClass("open");

    // Remove the "clicked" class from both Topic and Sub-Topic <p> elements
    $(".topic p").removeClass("clicked");
    $(".subtopic p").removeClass("clicked");

    // Remove the clicked-border class from all buttons
    $(".custom-select-btn").removeClass("clicked-border");
  });

  // Close the dropdown if clicked outside
  $(document).on("click", function (event) {
    const $currentDropdown = $(".custom-select.open"); // Get the currently open dropdown
    const isDropdownOpen = $currentDropdown.length > 0;

    // Check if the click was outside the dropdown and the dropdown is open
    if (!$(event.target).closest($currentDropdown).length && isDropdownOpen) {
      // Close the dropdown
      $currentDropdown.removeClass("open");
      $(".custom-select-btn").removeClass("clicked-border");
      $(".topic p").removeClass("clicked");
      $(".subtopic p").removeClass("clicked");

      // Only toggle the icons of the currently open dropdown
      $currentDropdown.find(".collapse-down-topic").toggle(); // Toggle visibility of .collapse-down
      $currentDropdown.find(".collapse-up-topic").toggle(); // Toggle visibility of .collapse-up
    }
  });

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.10.111/pdf.worker.min.js";

  let allFiles = [];

  function handleFiles(newFiles) {
    newFiles.forEach((file) => {
      const fileName = file.webkitRelativePath || file.name;
      const fileType = file.type || "";
      let iconPath = "../../../images/file.png"; // default icon

      // Set icon based on file type
      if (
        fileType === "application/pdf" ||
        fileName.toLowerCase().endsWith(".pdf")
      ) {
        iconPath = "../../../images/pdf.png";
      } else if (
        fileType.startsWith("text/") ||
        /\.(txt|csv|json)$/i.test(fileName)
      ) {
        iconPath = "../../../images/text.png";
      } else if (fileType.startsWith("image/")) {
        iconPath = "../../../images/image.png";
      }

      // Prevent duplicates
      if (allFiles.find((f) => (f.webkitRelativePath || f.name) === fileName)) {
        return;
      }

      allFiles.push(file);

      const $container = $(`
      <div class="attachment-container">
        <span class="file-icon" style="background-image: url('${iconPath}');"></span>
        <div class="file-name">${fileName}</div>
        <div class="x-icon">&#128473;</div>
      </div>
    `);

      $container.find(".x-icon").on("click", function () {
        allFiles = allFiles.filter(
          (f) => (f.webkitRelativePath || f.name) !== fileName
        );
        $container.remove();
      });

      $("#attachments-wrapper").append($container);

      // File reading logic
      const reader = new FileReader();

      if (
        fileType === "application/pdf" ||
        fileName.toLowerCase().endsWith(".pdf")
      ) {
        reader.onload = function (e) {
          const typedarray = new Uint8Array(e.target.result);
          pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
            let totalText = "";
            let promises = [];

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              promises.push(
                pdf.getPage(pageNum).then((page) =>
                  page.getTextContent().then((textContent) => {
                    const pageText = textContent.items
                      .map((item) => item.str)
                      .join(" ");
                    totalText += pageText + "\n\n";
                  })
                )
              );
            }

            Promise.all(promises).then(() => {
              console.log(`PDF content (${fileName}):`, totalText);
            });
          });
        };
        reader.readAsArrayBuffer(file);
      } else if (
        fileType.startsWith("text/") ||
        /\.(txt|csv|json)$/i.test(fileName)
      ) {
        reader.onload = (e) => {
          console.log(`Text content (${fileName}):`, e.target.result);
        };
        reader.readAsText(file);
      } else if (fileType.startsWith("image/")) {
        reader.onload = (e) => {
          console.log(`Image Base64 (${fileName}):`, e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        console.warn("Unsupported file type:", fileType);
      }
    });
  }

  // Choose File
  $("#fileInput").on("change", function () {
    handleFiles(Array.from(this.files));
    this.value = "";
  });

  // Choose Folder
  $("#chooseFolder").on("click", function () {
    $("#folderInput").click();
  });

  $("#folderInput").on("change", function () {
    handleFiles(Array.from(this.files));
    this.value = "";
  });

  function repositionUploadContainer() {
    const $uploadContainer = $(".upload-container");
    const $folderContainer = $(".folder-container");
    const $topicContainer = $(".topic-container");

    // Mobile view: move both below topicContainer
    if ($(window).width() <= 768) {
      // Move uploadContainer after topicContainer
      $topicContainer.after($uploadContainer);

      // Then move folderContainer after uploadContainer
      $uploadContainer.after($folderContainer);
    }

    // Optional: restore positions on larger screens
    if ($(window).width() > 768) {
      const $headerContainer = $(".header-container");
      const $addCategory = $(".add-category-container");

      if (!$headerContainer.has($addCategory).length) {
        $headerContainer.append($addCategory);
      }

      // You may also want to move uploadContainer and folderContainer back
      // to their original desktop positions here if needed
    }
  }

  // Call on DOM ready
  $(document).ready(repositionUploadContainer);

  // Call on resize
  $(window).on("resize", repositionUploadContainer);

  // CLEAR FIELDS
  $(document).on("click", "#clear-btn", function () {
    // Clear the input field
    $("#title-input").val("");

    // Clear the CKEditor 5 content
    if (editorInstance && typeof editorInstance.setData === "function") {
      editorInstance.setData("");
    }
  });

  // PUBLISH
  $(document).on("click", "#publish-btn", function () {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get("category_id");

    let name = $("#title-input").val().trim();
    let content = editorInstance.getData(); // ✅ get CKEditor content

    if (name === "" || content === "") {
      return toastr.warning("Please fill all fields");
    }

    $.ajax({
      url: "../../../operations/add-article.php",
      method: "POST",
      data: {
        categoryId: categoryId,
        title: name,
        content: content,
      },
      success: function (response) {
        if (response.status === "success") {
          Swal.fire({
            icon: "success",
            title: "Article Added Successfully!",
            text: `${response.message}`,
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didClose: () => {
              location.reload();
            },
          });
        }
      },
    });
  });
});
