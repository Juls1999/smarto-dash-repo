$(document).ready(function () {
  $("#tableSkeleton").hide();
  $("#feedbackTable").removeClass("hidden");

  new DataTable("#feedbackTable", {
    scrollY: 350,
    order: [[3, "desc"]],
  });

  // Modal logic
  $(".view-btn").on("click", function () {
    $("body").css("overflow", "hidden"); // Disable scroll
    const prompt = $(this).data("prompt");
    const response = $(this).data("response");
    const feedback = $(this).data("feedback");
    const created = $(this).data("created");

    $("#modalPrompt").text(prompt);
    $("#modalResponse").text(response);
    $("#modalFeedback").text(
      feedback.charAt(0).toUpperCase() + feedback.slice(1)
    );
    $("#modalCreated").text(created);

    $("#modalFeedback")
      .removeClass("feedback-like feedback-dislike")
      .addClass(
        "feedback-badge " +
          (feedback === "like" ? "feedback-like" : "feedback-dislike")
      );

    $("#viewModal").removeClass("hidden");
  });

  $("#closeModal").on("click", function () {
    $("#viewModal").addClass("hidden");
    $("body").css("overflow", ""); // enable scroll
  });
});
