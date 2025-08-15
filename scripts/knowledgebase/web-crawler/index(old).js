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

  let crawledUrls = new Set(); // ✅ Track previously crawled URLs

  // ✅ URL normalization function
  function normalizeUrl(url) {
    try {
      const u = new URL(url.trim().toLowerCase());
      u.pathname = u.pathname.replace(/\/$/, ""); // remove trailing slash
      return u.href;
    } catch (e) {
      return null;
    }
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
        <div class="skeleton-text"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text"></div>
      </div>
    `;
    }
    return skeletons;
  }

  function pollPerDomainCrawlStatus() {
    fetch("../../api/crawl_status.php")
      .then((res) => res.json())
      .then((data) => {
        // ✅ If it's a single job, not an array
        if (data && data.status && data.domain) {
          const $card = $(`.kb-card[data-domain="${data.domain}"]`);
          const $svg = $(`svg[data-domain="${data.domain}"]`);
          if (data.status === "in_progress" || data.status === "pending") {
            $card
              .addClass("cursor-not-allowed")
              .attr("title", "Crawl in progress — editing disabled");
            $svg.addClass("pointer-not-allowed");
          } else {
            $card.removeClass(" cursor-not-allowed ").removeAttr("title");
            $svg.removeClass("pointer-not-allowed");
          }
          return;
        }

        // ✅ If it's the expected array format
        if (Array.isArray(data.domains)) {
          data.domains.forEach(({ domain, status }) => {
            const $card = $(`.kb-card[data-domain="${domain}"]`);
            const $svg = $(`svg[data-domain="${domain}"]`);
            if (data.status === "in_progress" || data.status === "pending") {
              $card
                .addClass(" cursor-not-allowed")
                .attr("title", "Crawl in progress — editing disabled");
              $svg.addClass("pointer-events-none");
            } else {
              $card.removeClass("cursor-not-allowed ").removeAttr("title");
              $svg.removeClass("pointer-events-none");
            }
          });
        }
      })
      .catch((err) => {
        console.error("Failed to fetch crawl status:", err);
      });
  }

  function loadDomainsAndFiles() {
    $(".kb-container").html(generateSkeletonCards(5));

    $.get("../../api/files.php", function (response) {
      const results = response.domains || [response];
      $(".kb-container").empty();

      results.forEach(({ domain, files }) => {
        if (!files || files.length === 0) {
          $(".kb-container").append(`
          <div class="kb-card">
            <div class="card-header">
              <h3>${domain}</h3>
            </div>
            <p class="info-message">No files found.</p>
          </div>
        `);
          return;
        }

        const filesListHtml = files
          .slice(0, 5)
          .map((file) => {
            const readableName = cleanFileName(file.name);
            return `
            <li title="${file.name}">
              ${readableName}
            </li>`;
          })
          .join("");

        const lastFile = files[0];
        let statusMessage = `<p class="info-message">Not Indexed yet</p>`;
        if (lastFile.uploaded_hash) {
          if (lastFile.uploaded_hash !== lastFile.content_hash) {
            statusMessage = `<p class="info-message"><strong>Edited</strong></p>`;
          } else {
            statusMessage = `<p class="info-message"><strong>Indexed recently</strong></p>`;
          }
        }

        $(".kb-container").append(`
        <div class="kb-card" data-domain="${domain}">
          <div class="card-header">
            <h3>${domain}</h3>
            <svg data-domain="${domain}" class="color-gray ellipsis-icon" xmlns="http://www.w3.org/2000/svg" width="21" height="5" viewBox="0 0 21 5" fill="none">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M5 2.5C5 3.88071 3.88071 5 2.5 5C1.11929 5 0 3.88071 0 2.5C0 1.11929 1.11929 0 2.5 0C3.88071 0 5 1.11929 5 2.5ZM13 2.5C13 3.88071 11.8807 5 10.5 5C9.11929 5 8 3.88071 8 2.5C8 1.11929 9.11929 0 10.5 0C11.8807 0 13 1.11929 13 2.5ZM18.5 5C19.8807 5 21 3.88071 21 2.5C21 1.11929 19.8807 0 18.5 0C17.1193 0 16 1.11929 16 2.5C16 3.88071 17.1193 5 18.5 5Z" fill="currentColor"/>
            </svg>
            <div class="article-menu">
              <div class="show-article" data-domain="${domain}">Show All Articles</div>
              <div class="edit-article" data-domain="${domain}">Add Subtitle</div>
            </div>
          </div>
          <ul>${filesListHtml}</ul>
          ${statusMessage}
        </div>
      `);
      });

      $(".loader").css("display", "none");
      pollPerDomainCrawlStatus(); // Refresh status styles
    }).fail(function (err) {
      console.error("❌ Failed to fetch data:", err);
      $(".kb-container").html(`
      <p class="info-message">Error fetching data.</p>
    `);
    });
  }

  // ✅ Load previous crawl history
  $.getJSON("../../api/crawl_history.php", function (data) {
    if (Array.isArray(data.jobs)) {
      data.jobs.forEach((job) => {
        const normalized = normalizeUrl(job.seed_url);
        if (normalized) {
          crawledUrls.add(normalized);
        }
      });
    }
  });

  $(".kb-container").html(generateSkeletonCards(5));

  $.get("../../api/files.php", function (response) {
    const results = response.domains || [response]; // normalize format

    // Clear loader
    $(".kb-container").empty();

    results.forEach(({ domain, files }) => {
      if (!files || files.length === 0) {
        $(".kb-container").append(`
          <div class="kb-card">
            <div class="card-header">
              <h3>${domain}</h3>
            </div>
            <p class="info-message">No files found.</p>
          </div>
        `);
        return;
      }

      const filesListHtml = files
        .slice(0, 5)
        .map((file) => {
          const readableName = cleanFileName(file.name);
          return `
            <li title="${file.name}">
              ${readableName}
            </li>`;
        })
        .join("");

      const lastFile = files[0];
      let statusMessage = `<p class="info-message">Not Indexed yet</p>`;
      if (lastFile.uploaded_hash) {
        if (lastFile.uploaded_hash !== lastFile.content_hash) {
          statusMessage = `<p class="info-message"><strong>Edited</strong></p>`;
        } else {
          statusMessage = `<p class="info-message"><strong>Indexed recently</strong></p>`;
        }
      }

      $(".kb-container").append(`
         <div class="kb-card" data-domain="${domain}">
          <div class="card-header">
            <h3>${domain}</h3>
            <svg data-domain="${domain}" class="color-gray ellipsis-icon" xmlns="http://www.w3.org/2000/svg" width="21" height="5" viewBox="0 0 21 5" fill="none">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M5 2.5C5 3.88071 3.88071 5 2.5 5C1.11929 5 0 3.88071 0 2.5C0 1.11929 1.11929 0 2.5 0C3.88071 0 5 1.11929 5 2.5ZM13 2.5C13 3.88071 11.8807 5 10.5 5C9.11929 5 8 3.88071 8 2.5C8 1.11929 9.11929 0 10.5 0C11.8807 0 13 1.11929 13 2.5ZM18.5 5C19.8807 5 21 3.88071 21 2.5C21 1.11929 19.8807 0 18.5 0C17.1193 0 16 1.11929 16 2.5C16 3.88071 17.1193 5 18.5 5Z" fill="currentColor"/>
            </svg>
            <div class="article-menu">
              <div class="show-article" data-domain="${domain}">Show All Articles</div>
              <div class="edit-article" data-domain="${domain}">Add Subtitle</div>
            </div>
          </div>
          <ul>${filesListHtml}</ul>
          ${statusMessage}
        </div>
      `);
    });

    $(".loader").css("display", "none");
    pollPerDomainCrawlStatus();
    setInterval(pollPerDomainCrawlStatus, 10000); // Every 10s
  }).fail(function (err) {
    console.error("❌ Failed to fetch data:", err);
    $(".kb-container").html(`
      <p class="info-message">Error fetching data.</p>
    `);
  });

  $(document).on("click", ".ellipsis-icon", function () {
    $(this).closest(".kb-card").find(".article-menu").toggle();
  });

  // $(document).on("click", ".edit-article", function () {
  //   const domain = $(this).data("domain");
  //   sessionStorage.setItem("editDomain", domain);
  //   window.location.href = "edit-files.php";
  // });

  $(document).on("click", ".show-article", function () {
    const domain = $(this).data("domain");
    window.location.href = `/kb-figma/knowledgebase/web-crawler/all-articles/?domain=${encodeURIComponent(
      domain
    )}`;
  });

  $(document).on("mouseleave", ".kb-card", function () {
    $(this).find(".article-menu").hide();
  });
  // Open modal and disable scroll
  $("#crawl-btn").on("click", function () {
    $("body").css("overflow", "hidden"); // Disable scroll
    $("#crawlModal").fadeIn();
  });

  // Close modal and re-enable scroll
  $("#closeModal").on("click", function () {
    $("#crawlModal").fadeOut();
    $("body").css("overflow", "auto"); // Re-enable scroll
  });

  // ✅ Prevent duplicate crawl here
  $("#startCrawl").on("click", function () {
    const inputUrl = $("#seedUrl").val().trim();
    const normalizedUrl = normalizeUrl(inputUrl);

    try {
      const parsed = new URL(normalizedUrl);
      if (parsed.pathname !== "/" && parsed.pathname !== "") {
        toastr.error("Only root domains are allowed (e.g., support.site.com)");
        return;
      }
    } catch (e) {
      toastr.error("Invalid URL format.");
      return;
    }

    if (!inputUrl || !normalizedUrl) {
      toastr.error("Please enter a valid Seed URL.");
      return;
    }

    if (crawledUrls.has(normalizedUrl)) {
      toastr.warning("This URL has already been crawled.");
      return;
    }

    const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/;
    if (!urlRegex.test(inputUrl)) {
      toastr.error("Invalid URL format.");
      return;
    }

    // ✅ Show SweetAlert2 loading modal
    Swal.fire({
      title: "Checking Seed URL...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();

        fetch(inputUrl, { method: "HEAD", mode: "no-cors" })
          .then(() => {
            $.ajax({
              url: "../../api/crawl.php",
              method: "POST",
              contentType: "application/json",
              data: JSON.stringify({ url: inputUrl }),
              success: function () {
                crawledUrls.add(normalizedUrl);

                // ✅ Immediately reflect status in UI
                const domain = new URL(normalizedUrl).hostname;
                const $card = $(`.kb-card[data-domain="${domain}"]`);
                const $svg = $(`svg[data-domain="${domain}"]`);

                if ($card.length && $svg.length) {
                  $card
                    .addClass("cursor-not-allowed")
                    .attr("title", "Crawl in progress — editing disabled");
                  $svg.addClass("pointer-not-allowed");
                }

                Swal.fire({
                  title: "Crawling started!",
                  icon: "success",
                  showConfirmButton: false,
                  timer: 2000,
                });

                // ✅ Let the polling handle actual status updates
              },
            });
          })
          .catch(() => {
            Swal.close();
            toastr.error("Seed URL is unreachable.");
          });
      },
    });
  });
});
