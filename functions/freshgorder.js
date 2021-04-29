const functions = require('firebase-functions');
const Razorpay = require('razorpay')
exports.razorpayOrder = functions.https.onCall((data, context) => {
    return new Promise((resolve, reject) => {
        var instance = new Razorpay({ key_id: 'rzp_live_F3OXUXxtnZRh0z', key_secret: 'uDawG1izJwnNC8adKIDiMaHq' })
        var options = {
            currency: "INR",
            amount: data['amount']
        };
        instance.orders.create(options, (error, order) => {
            if (error) {
                reject(error.error.description)
            }
            else {
                resolve(order)
            }
        });
    })
})