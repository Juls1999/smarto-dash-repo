$(document).ready(function () {
  toastr.options = {
    closeButton: true,
    closeMethod: "fadeOut",
    closeDuration: 300,
    closeEasing: "swing",
    showEasing: "swing",
    hideEasing: "linear",
    preventDuplicates: true,
    timeOut: 3000,
    extendedTimeOut: 1000,
    progressBar: true,
  };

  const $chatBox = $("#chatBox");

  const defaultBotPrompt = "Hello! How can I assist you today?";
  $("<p>").text(defaultBotPrompt).addClass("bot-message").appendTo($chatBox);

  function formatCitations(text, citations) {
    const refMap = {};
    const seenSources = {};
    let currentIndex = 1;
    const orderedCitations = [];

    citations.forEach((c) => {
      const refId = c.reference_id;
      const refPattern = new RegExp(`\\[\\[C${refId}]]`);
      const matchIndex = text.search(refPattern);
      if (matchIndex !== -1) {
        orderedCitations.push({ ...c, index: matchIndex });
      }
    });

    orderedCitations.sort((a, b) => a.index - b.index);

    orderedCitations.forEach((c) => {
      const key = `${c.title}|${c.url}`;
      if (seenSources[key]) {
        refMap[c.reference_id] = seenSources[key];
      } else {
        refMap[c.reference_id] = currentIndex;
        seenSources[key] = currentIndex;
        currentIndex++;
      }
    });

    const newText = text.replace(/\[\[C(\d+)]]/g, function (match, refId) {
      const newIndex = refMap[refId];
      const citation = citations.find((c) => c.reference_id == refId);
      if (newIndex && citation && citation.url) {
        const url = citation.url;
        const title = citation.title || `Source ${newIndex}`;
        return `<a href="${url}" target="_blank" title="${title}" class="citation-link">[${newIndex}]</a>`;
      }
      return match;
    });

    return newText;
  }

  $("#sendButton").on("click", function () {
    const $inputField = $("#userPrompt");
    const prompt = $inputField.val().trim();

    if (prompt) {
      $("<div class='message-wrapper user'>")
        .append($("<div class='user-message'>").text(prompt))
        .appendTo($chatBox);

      $inputField.val("");
      $chatBox.scrollTop($chatBox[0].scrollHeight);

      const $typingPlaceholder = $("<p>")
        .addClass("typing-placeholder")
        .append(
          $("<div>").addClass("dot-bounce"),
          $("<div>").addClass("dot-bounce"),
          $("<div>").addClass("dot-bounce")
        );

      $chatBox.append($typingPlaceholder);
      $chatBox.scrollTop($chatBox[0].scrollHeight);

      $.ajax({
        url: "../api/chat.php",
        type: "POST",
        data: { prompt: prompt },
        dataType: "json",
        success: function (response) {
          $typingPlaceholder.remove();

          if (response && response.response) {
            const formattedResponse = formatCitations(
              response.response,
              response.citations
            );

            const $message = $("<div class='bot-message'>").html(
              formattedResponse
            );

            $("<div class='message-wrapper bot'>")
              .append($message)
              .appendTo($chatBox);

            const $reactionContainer = $("<div>")
              .addClass("reaction-container")
              .append(
                $("<span>")
                  .html('<i class="far fa-thumbs-up"></i>')
                  .addClass("like-icon")
                  .on("click", function () {
                    const $dislikeIcon = $(this).siblings(".dislike-icon");
                    if (!$(this).find("i").hasClass("liked")) {
                      $(this).find("i").addClass("liked");
                      toastr.success("You liked the response!");
                      $dislikeIcon.find("i").removeClass("disliked");
                      disableIcons($message);
                      postFeedback(prompt, response.response, "like");
                    }
                  }),
                $("<span>")
                  .html('<i class="far fa-thumbs-down"></i>')
                  .addClass("dislike-icon")
                  .on("click", function () {
                    const $likeIcon = $(this).siblings(".like-icon");
                    if (!$(this).find("i").hasClass("disliked")) {
                      $(this).find("i").addClass("disliked");
                      toastr.error("You disliked the response!");
                      $likeIcon.find("i").removeClass("liked");
                      disableIcons($message);
                      postFeedback(prompt, response.response, "dislike");
                    }
                  })
              );

            $message.append($reactionContainer);
            $chatBox.append($message);
          } else {
            toastr.error("No AI response found!");
          }

          $chatBox.scrollTop($chatBox[0].scrollHeight);
        },
        error: function (xhr, status, error) {
          $typingPlaceholder.remove();
          console.error("AJAX Error:", status, error);
          toastr.error(
            "An error occurred: " + xhr.status + " " + xhr.statusText
          );
        },
      });
    } else {
      toastr.warning("Please fill the Prompt field!");
    }
  });

  $("#userPrompt").on("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      $("#sendButton").click();
    }
  });

  $("#destroySessionBtn").click(function () {
    $.ajax({
      type: "POST",
      url: "../session/destroy_session.php",
      success: function (response) {
        if (response) {
          toastr.success("New Chat created!");
          $chatBox.empty();
          $("<p>")
            .text(defaultBotPrompt)
            .addClass("bot-message")
            .appendTo($chatBox);
        }
      },
    });
  });

  function postFeedback(prompt, response, feedbackType) {
    $.ajax({
      url: "../operations/save-feedback.php",
      type: "POST",
      data: {
        prompt: prompt,
        response: response,
        feedbackType: feedbackType,
      },
      success: function (data) {
        console.log("Feedback successfully sent:", data);
      },
      error: function (xhr, status, error) {
        console.error("Error sending feedback:", status, error);
      },
    });
  }

  function disableIcons($message) {
    $message.find(".like-icon, .dislike-icon").addClass("disabled-feedback");
  }
});
