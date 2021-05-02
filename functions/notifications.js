const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore()

exports.orderStatus = functions.https.onCall(async (data, context) => {
    var order = await db.collection('orders').doc(data.orderId)
    var userId = await (await order.get()).get('userId');
    var user = await (await db.collection('users').doc(userId).get()).get('token')
    return order.update({ livestatus: data.status }).then(() => {
        var message = {
            notification: {
                title: "Order update",
                body: `Your order is ${data.status}`
            },
            token: user,
        }
        admin.messaging().send(message)
        return { error: false }
    }).catch((err) => {
        return { error: true, data: err.toString() }
    })
})