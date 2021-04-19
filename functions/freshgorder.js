const functions = require('firebase-functions');
const Razorpay = require('razorpay')
exports.razorpayOrder = functions.https.onRequest(async (req, res) => {
    var instance = new Razorpay({ key_id: 'rzp_live_F3OXUXxtnZRh0z', key_secret: 'uDawG1izJwnNC8adKIDiMaHq' })
    try {
        var options = {
            currency: "INR",
            receipt: req.body['receiptId'] || "order_rcptid_11",
            amount: req.body['amount']
        };
    } catch (error) {
        console.log(String(error))
        res.status(500).json({ error: String(error) })
    }
    instance.orders.create(options, (err, order) => {
        if (err) {
            console.log(String(error))
            res.status(500).json({ error: String(error) })
        }
        console.log(order)
        res.status(200).json(order)
    });
})