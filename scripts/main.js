$(document).ready(function () {
  console.log("Hi from main.js");

  // When the search icon is clicked
  $(".search-icon").on("click", function () {
    triggerSearch();
  });

  // When the "Enter" key is pressed in the search input
  $("#search-input").on("keydown", function (e) {
    if (e.keyCode === 13) {
      // Enter key code is 13
      e.preventDefault(); // Prevents form submission if inside a form
      triggerSearch();
    }
  });

  // Function to trigger the search action
  function triggerSearch() {
    var searchQuery = $("#search-input").val().trim(); // Get the value from the input field and remove any extra spaces
    if (searchQuery === "") {
      alert("No search query provided.");
      return; // Don't run the function if the input is empty
    }

    alert("Search query:" + " " + searchQuery); // You can replace this with any action (e.g., form submit, filtering results)

    // Example of submitting the form (if needed)
    // $('#search-form').submit();
  }

  // Message
  $(".message-container").click(function () {
    alert("Message icon clicked!");
  });

  //Notification
  $(".notification-container").click(function () {
    alert("Notification icon clicked!");
  });

  //Profile
  $(".profile-container").click(function () {
    alert("Profile icon clicked!");
  });

  // clear placeholder if focus
  $("#search-input").on("focus", function () {
    $(this).data("placeholder", $(this).attr("placeholder"));
    $(this).attr("placeholder", "");
  });

  $("#search-input").on("blur", function () {
    $(this).attr("placeholder", $(this).data("placeholder"));
  });
});
