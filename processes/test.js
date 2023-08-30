const request = require("request");
const axios = require("axios");
const fb = require("fb");
require("dotenv").config();
fb.setAccessToken(process.env.PAGE_ACCESS_TOKEN);

module.exports = async function processPostback(event) {
  const payload = event.postback.payload;
  const { sender, postback } = event;
  const { id: senderID } = sender;
  const { payload: message } = postback;

  const numRegex =
    /^(\+?\d{1,2}\s?)?(\d{3}|\(\d{3}\))[\s.-]?\d{3}[\s.-]?\d{3,4}$/;
  const url = `https://graph.facebook.com/v15.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`;
  const nameUrl = `https://graph.facebook.com/${senderID}?fields=name,profile_pic&access_token=${process.env.PAGE_ACCESS_TOKEN}`;

  let debt = null;
  let expireDate = null;
  let clientName = "";
  let clientProUrl = "";
  let message_id = "";
  let tmp = "";

  try {
    const { data } = await axios.get(nameUrl);
    clientName = data.name;
    clientProUrl = data.profile_pic;
  } catch (err) {
    console.log(err);
  }

  try {
    const options = {
      url: `https://graph.facebook.com/v15.0/${senderID}/conversations`,
      params: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
      },
    };
    const response = await axios(options);
    const { data } = response;
    message_id = data.data[0].link;
  } catch (err) {
    console.log(err);
  }

  let names = [];
  let resLocations = [];
  let workHours = [];
  try {
    const resp = await axios.post(
      "http://35.88.61.60/middleware/terminals/getLocations"
    );
    const locations = resp.data.data;
    for (const location of locations) {
      const { name, location: resLocation, working_hours } = location;
      names.push(name);
      resLocations.push(resLocation);
      workHours.push(working_hours);
    }
  } catch (err) {
    console.log(err);
  }

  // Locations Text
  let _locationText = names.reduce((acc, name, index) => {
    const location = resLocations[index];
    const hours = workHours[index];
    return acc + `\n${name}, Locations: ${location}, Work Hours: ${hours}\n`;
  }, "");

  console.log(_locationText);

  const backurl = "http://35.88.61.60/middleware/loans/getByPhone";
  const backOptions = {
    url: backurl,
    method: "POST",
    json: {
      phone: number,
      psid: senderID,
      name: clientName,
      profile_pic: clientProUrl,
      message_id: message_id,
    },
  };

  request.post(backOptions, (err, body) => {
    if (err) {
      console.log(err);
      return;
    }

    console.log(JSON.stringify(body));
    tmp = JSON.stringify(body);
    const obj = JSON.parse(tmp);

    try {
      debt = obj.body.data.repayment.current_pay_amount;
      expireDate = obj.body.data.repayment.current_pay_date;
    } catch (err) {
      debt = null;
    }

    if (
      !debt &&
      !["1", "2", "3", "4"].includes(message) &&
      numRegex.test(message)
    ) {
      const errorOptions = {
        url: url,
        method: "POST",
        json: true,
        body: {
          recipient: {
            id: senderID,
          },
          message: {
            text: `${message} Is Not Registered\nBut You Can Register, Our Loan Amounts: \n440PHP\n660PHP\n880PHP\n1100PHP\n1300PHP\n1700PHP`,
          },
        },
      };
      request.post(errorOptions, (err) => {
        console.log("[!] SENT ERROR");
      });
    } else if (message == "2") {
      const payOptions = {
        url: url,
        method: "POST",
        json: true,
        body: {
          recipient: {
            id: senderID,
          },
          message: {
            text: "Enter Your Phone Number",
          },
        },
      };
      request.post(payOptions, () => {
        console.log("[+] 1 Option Gone");
      });
    } else if (message == "1") {
      const otpOptions = {
        url: url,
        method: "POST",
        json: true,
        body: {
          recipient: {
            id: senderID,
          },
          message: {
            text: `Enter your phone number and otp as follows:\n{Phone Number}, {OTP}`,
          },
        },
      };
      request.post(otpOptions, (err, res) => {
        if (!err) {
          console.log("[+] USER CHOSE 2");
        } else {
          console.log(err);
        }
      });
    } else if (payload == "LOCATIONS_PAYLOAD") {
      const locOptions = {
        url: url,
        method: "POST",
        json: true,
        body: {
          recipient: {
            id: senderID,
          },
          message: {
            text: `${_locationText}`,
          },
        },
      };
      request.post(locOptions, (err) => {
        console.log("[+] LOCATION SENT");
      });
    } else if (message == "4") {
      const menuOptions = {
        url: url,
        method: "POST",
        json: true,
        body: {
          recipient: {
            id: senderID,
          },
          message: {
            text: `Hi Sir\n1: Verify OTP\n2: Get Repayment Info\n3: Locations\n4: Menu`,
          },
        },
      };
      request.post(menuOptions, (err) => {
        console.log("[+] MENU SENT");
      });
    } else if (message.length > 16 && message.length < 21) {
      const otpNum = message.split(/[, ]+/);
      const sendOtp = {
        url: "http://35.88.61.60/middleware/clients/verify-otp",
        method: "POST",
        json: true,
        body: {
          phone: `${otpNum[0]}`,
          otp: `${otpNum[1]}`,
          psid: senderID,
          name: clientName,
          profile_pic: clientProUrl,
          message_id: message_id,
        },
      };
      request.post(sendOtp, (err, res) => {
        if (res.statusCode != 400) {
          const rightOTP = {
            url: url,
            method: "POST",
            json: true,
            body: {
              recipient: {
                id: senderID,
              },
              message: {
                text: `OTP Verified`,
              },
            },
          };
          request.post(rightOTP, (err) => {
            console.log("[+] OTP VERIFIED");
          });
        } else {
          const rightOTP = {
            url: url,
            method: "POST",
            json: true,
            body: {
              recipient: {
                id: senderID,
              },
              message: {
                text: `Wrong OTP`,
              },
            },
          };
          request.post(rightOTP, (err) => {
            console.log("[!] Wrong OTP");
          });
        }
      });
    } else {
      const options = {
        url: url,
        method: "POST",
        json: true,
        body: {
          recipient: {
            id: senderID,
          },
          message: {
            text: `Your debt: ${debt}\nYour expire date: ${expireDate}`,
          },
        },
      };
      request.post(options, () => {
        console.log("[+] DEBT GONE");
      });
    }
  });
};
