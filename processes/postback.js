const request = require('request');

 module.exports = function processPostback(event) {
     const senderID = event.sender.id;
     const payload = event.postback.payload;
     const url = 'https://graph.facebook.com/v15.0/me/messages?access_token=' + process.env.PAGE_ACCESS_TOKEN
     console.log("shitting")
     console.log(payload)
     console.log(senderID)
     if (payload === 'GET_STARTED_PAYLOAD') {
            const options = {
                url: url,
                method: 'POST',
                json: true,
                body: {
                    "recipient": {
                        "id": senderID
                    },
                    "message": {
                        "text": `Hi Sir\n1: Verify OTP\n2: Get Repayment Info\n3: Locations\n4: Menu`
                    }
                }
            }
            request.post(options, (err) => {
                console.log('[+] SENT')
            })
            console.log("OSIJFIDS")
        };
     }