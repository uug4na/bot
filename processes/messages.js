const request = require("request");
const axios = require("axios");
const fb = require("fb");

require("dotenv").config();

fb.setAccessToken(process.env.PAGE_ACCESS_TOKEN);

module.exports = async function processMessage(event) {
  if (!event.message.is_echo) {
    const url =
      "https://graph.facebook.com/v15.0/me/messages?access_token=" +
      process.env.PAGE_ACCESS_TOKEN;
    const nameUrl =
      `https://graph.facebook.com/${event.sender.id}?fields=name,profile_pic&access_token=` +
      process.env.PAGE_ACCESS_TOKEN;
    // console.log("MESSAGE DATAS > ", event.message);

    const message = event.message.text;
    const senderID = event.sender.id;
    const number = event.message.text;
    const numRegex =
      /^(\+?\d{1,2}\s?)?(\d{3}|\(\d{3}\))[\s.-]?\d{3}[\s.-]?\d{3,4}$/;

    var debt = "";
    var expireDate = "";
    var clientName = "";
    var clientProUrl = "";
    var message_id = "";
    var tmp = "";

    try {
      const response = await axios.get(nameUrl);
      console.log("Data > ", response.data);
      clientName = response.data.name;
      clientProUrl = response.data.profile_pic;
      console.log(`CLIENTNAME > ${clientName}`);
      console.log(`PROFILE LINK > ${clientProUrl}`);
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
      const data = response.data;
      console.log("LINK > ", data.data[0].link);
      message_id = data.data[0].link;
    } catch (err) {
      console.log(err);
    }

    var names = [];
    var resLocations = [];
    var workHours = [];
    try {
      const resp = await axios.post(
        "http://13.52.218.164:8000/api/v1/terminals/getLocations"
      );
      const locations = resp.data.data;
      for (const shits in locations) {
        const lmao = JSON.parse(JSON.stringify(locations[shits]));
        names.push(lmao.name);
        resLocations.push(lmao.location);
        workHours.push(lmao.working_hours);
      }
    } catch (err) {
      console.log(err);
    }

    // [ FETCHING LOCATION NAMES ]
    var text = "";
    for (let i = 0; i < names.length; i++) {
      text +=
        "\n" +
        names[i] +
        ", Locations: " +
        resLocations[i] +
        ", Work Hours: " +
        workHours[i] +
        "\n";
    }

    const backurl = "http://13.52.218.164:8000/api/v1/loans/getByPhone";
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
      if (!err) {
        console.log(JSON.stringify(body));
        tmp = JSON.stringify(body);
        const obj = JSON.parse(tmp);
        try {
          debt = obj.body.data.repayment.current_pay_amount;
          expireDate = obj.body.data.repayment.current_pay_date;
        } catch (err) {
          debt = null;
        }
      } else {
        console.log(err);
      }

      if (
        !debt &&
        message != "1" &&
        message != "2" &&
        message != "3" &&
        message != "4" &&
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
      } else if (message == "3") {
        const locOptions = {
          url: url,
          method: "POST",
          json: true,
          body: {
            recipient: {
              id: senderID,
            },
            message: {
              text: `${text}`,
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
          url: "http://13.52.218.164:8000/api/v1/clients/verify-otp",
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
  }
};
