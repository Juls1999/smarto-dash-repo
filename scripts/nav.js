$(document).ready(function () {
  console.log("Hi from nav.js");

  $(".logo").click(function () {
    // window.location.href = "/html/kb-figma/";
    window.location.href = "/kb-figma/";
  });

  $(".collapse-menu").click(function () {
    // Toggle the visibility of the submenu
    $(".submenu-divider").toggle();

    // Toggle visibility of .collapse-down and .collapse-up
    $(".collapse-down").toggle(); // Toggle visibility of .collapse-down
    $(".collapse-up").toggle(); // Toggle visibility of .collapse-up

    // Toggle the 'show-flex' class on .submenu
    $(".submenu").toggleClass("show-flex");
  });

  // Prevent default action on the collapse-link (e.g., if it's an anchor tag)
  $(".collapse-link").click(function (e) {
    e.preventDefault();
  });

  // SHOW AND HIDE NAV in MOBILE
  $(".hamburger").click(function () {
    const $nav = $(".sidebar nav");

    if ($nav.hasClass("open")) {
      // Set fast hide transition before removing class
      $nav.css("transition", "all 0.3s cubic-bezier(0.7, 0, 0.3, 1)");
      $nav.removeClass("open");
    } else {
      // Set slow show transition before adding class
      $nav.css("transition", "all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)");
      $nav.addClass("open");
    }

    const $utility = $(".utility-container");

    if ($utility.hasClass("hidden")) {
      // Fast show
      $utility.css(
        "transition",
        "opacity 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)"
      );

      $utility.removeClass("hidden");
    } else {
      // Slow hide
      $utility.css(
        "transition",
        "opacity 0.3s cubic-bezier(0.7, 0, 0.3, 1), transform 0.3s cubic-bezier(0.7, 0, 0.3, 1)"
      );

      $utility.addClass("hidden");
    }

    $(this).toggleClass("active");
    $(".content-container").toggleClass("blurred");
  });
});
