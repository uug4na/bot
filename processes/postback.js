const request = require("request");

module.exports = function processPostback(event) {
  const senderID = event.sender.id;
  const payload = event.postback.payload;
  const url =
    "https://graph.facebook.com/v15.0/me/messages?access_token=" +
    process.env.PAGE_ACCESS_TOKEN;
  console.log(payload);
  console.log(senderID);
  if (payload === "GET_STARTED_PAYLOAD") {
    const options = {
      url: url,
      method: "POST",
      json: true,
      body: {
        recipient: {
          id: senderID,
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: "Hi Sir, how can I assist you?",
              buttons: [
                {
                  type: "postback",
                  title: "Verify OTP",
                  payload: "VERIFY_OTP_PAYLOAD", // Define a unique payload for this option
                },
                {
                  type: "postback",
                  title: "Get Repayment Info",
                  payload: "REPAYMENT_INFO_PAYLOAD", // Define a unique payload for this option
                },
                {
                  type: "postback",
                  title: "Locations",
                  payload: "LOCATIONS_PAYLOAD", // Define a unique payload for this option
                },
                {
                  type: "postback",
                  title: "Menu",
                  payload: "MENU_PAYLOAD", // Define a unique payload for this option
                },
              ],
            },
          },
        },
      },
    };
    request.post(options, (err) => {
      console.log("[+] SENT");
    });
  }
};
