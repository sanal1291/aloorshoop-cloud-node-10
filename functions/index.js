const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore()
exports.freshgorder = require('./freshgorder');
exports.notifications = require('./notifications')


async function auth(query, res) {
    // // eslint-disable-next-line no-constant-condition
    // if (true) {
    //     return true
    // }
    let doc = await db.collection('lengths').doc('keys').get()
    let ck = doc.get('consumer_key')
    let cs = doc.get('consumer_secret')
    if (query.consumer_secret === cs && query.consumer_key === ck) {
        return true
    } else {
        res.status(500).json({ "status": "error", "error": "authentication failed" })
        return false;
    }
}

async function getID(req, docRef) {
    if (req.body['id'] === 0) {
        var doc = await docRef.get();
        const id = doc.get('nextId')
        docRef.update({
            nextId: id + 1,
        })
        return id.toString();
    } else {
        return req.body['id'].toString();
    }
}
async function getOrderID() {
    const docRef = db.collection("lengths").doc("order");
    var id = null;
    const doc = await docRef.get()
    id = doc.get('nextId');
    await docRef.update({
        nextId: id + 1
    })
    return id.toString();
}

function createSearchArray(item) {
    const name = item.toLowerCase().trim();
    var arr = [];
    for (var i = 1; i <= name.length; i++) {
        arr.push(name.slice(0, i));
    }
    return arr;
}
//---------------------------------------------------------------------------------------------------------------------//
exports.additems = functions.https.onRequest(async (req, res) => {
    if (!await auth(req.query, res)) return
    var indiItem = db.collection("independentItems");
    const docRef = db.collection("lengths").doc("indiItem");
    try {
        const id = await getID(req, docRef)
        const searchArray = createSearchArray(req.body['name'])
        await indiItem.doc(id).set({
            id: id,
            name: req.body['name'],
            displayNames: { en: req.body['name'] },
            slug: req.body['slug'],
            categories: req.body['categories'],
            tags: req.body['tags'],
            stock_quantity: req.body['stock_quantity'] || 0,
            regularPrice: req.body['regular_price'],
            salePrice: req.body['sale_price'],
            price: parseInt(req.body['sale_price']),
            searchArray: searchArray,
            uploadedOn: new Date(),
        })
        res.status(200).json({ "id": parseInt(id), "type": "simple", "name": req.body['name'], "slug": req.body['slug'] });
    } catch (error) {
        res.status(500).json({ "status": "error", "error": error.toString() });
    }
});
//-------------------------------------------------------------------------------------------------------------------------//
exports.categories = functions.https.onRequest(async (req, res) => {
    if (!await auth(req.query, res)) return
    const categories = db.collection('Categories')
    const docRef = db.collection("lengths").doc("category");
    var body = req.body
    const id = await getID(req, docRef);
    const searchArray = createSearchArray(body['name'])
    try {
        await categories.doc(id).set({
            id: id,
            displayNames: { en: body['name'] },
            slug: body['slug'],
            parent: body['parent'],
            description: body['description'],
            display: body['display'],
            menuOrder: body['menu_order'],
            count: body['count'],
            searchArray: searchArray,
            uploadedOn: new Date(),
        })
        res.status(200).json({ "id": parseInt(id) })
    } catch (error) {
        res.status(500).json({ "status": "error", "error": error.toString() });
    }

})
//----------------------------------------------------------------------------------------------------------------------//
exports.manufacturer = functions.https.onRequest(async (req, res) => {
    if (!await auth(req.query, res)) return
    const manufacturer = db.collection('manufacturer')
    const docRef = db.collection("lengths").doc("tag");
    try {
        const body = req.body;
        const id = await getID(req, docRef)
        await manufacturer.doc(id).set({
            id: id,
            name: body['name'],
            slug: body['slug'],
            uploadedOn: new Date(),
        })
        res.status(200).json({ "id": parseInt(id) })
    } catch (error) {
        res.status(500).json({ "status": "error", "error": error.toString() });
    }
})

exports.update = functions.https.onRequest(async (req, res) => {
    if (!await auth(req.query, res)) return
    const indiItem = db.collection('independentItems')
    var errorMap = {};
    var updateItem = item => {
        return indiItem.doc(item['id'].toString()).update({
            reqularPrice: item['regular_price'],
            salePrice: item['sale_price'],
            stock_quantity: item['stock_quantity'],
            price: parseInt(req.body['sale_price']),
        }).catch((error) => {
            errorMap[item['id'].toString()] = `item with id ${item.id.toString()} doesn't exist`
        })
    }
    try {
        Promise.all(req.body['update'].map(item => updateItem(item)))
            .then(() => {
                if (Object.keys(errorMap).length === 0) {
                    return res.status(200).json()
                } else {
                    return res.status(400).json({ "error": errorMap, "sent data": req.body })
                }
            }
            )
            .catch((error) => {
                res.status(400).json({ "error": error.toString(), "sent data": req.body })
            })
    } catch (error) {
        console.log('hi')
        res.status(400).json({ "error": error.toString(), "sent data": req.body })
    }

})

//----------------------------------------------------------------------------------------------------------------------------------------//
exports.order = functions.https.onRequest(async (req, res) => {
    if (!await auth(req.query, res)) return
    const params = req.params[0].split("/")
    const id = params[params.length - 1];
    try {
        const order = await db.collection('orders').where("orderId", "==", id).get();

        if (order.docs.length) {
            const json = orderJson(order.docs[0].data())
            res.status(200).json(json)
        } else {
            res.status(404).json({ "id": id, "error": "Document with the given id doenst exists" })
        }
    } catch (error) {
        res.status(500).json({ "id": id, "error": error.toString() })
    }
})


function orderJson(doc) {
    var date = new Date(doc.dateTime.seconds * 1000)
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    var localISOTime = (new Date(date - tzoffset)).toISOString().slice(0, -5);
    date = date.toISOString().slice(0, -5);
    console.log(date)
    var discount = 0;
    var items = [];
    const pushFn = (item) => {
        items.push({
            "id": parseInt(item.itemId),
            "name": item.itemName['en'],
            "product_id": parseInt(item.itemId),
            "variation_id": 0,
            "quantity": item.quantity,
            "subtotal": parseFloat(item.total).toFixed(2).toString(),
            "total": parseFloat(item.total).toFixed(2).toString(),
            "meta_data": [],
            "sku": "",
            "price": item.unitPrice,
        })
    }
    if (doc.items) {
        for (let index = 0; index < doc.items.length; index++) {
            pushFn(doc.items[index])
        }
    } else {
        for (let i = 0; i < doc.packages.length; i++) {
            discount += doc.packages[i].quantity *
                (doc.packages[i].total - doc.packages[i].price)
            for (let j = 0; j < doc.packages[i].items.length; j++) {
                pushFn(doc.packages[i].items[j])
            }
        }
    }
    return {
        "id": parseInt(doc.orderId),
        "parent_id": 0,
        "number": doc.orderId,
        "order_key": "wc_order_58d2d042d1d",
        "created_via": "REST-api",
        "version": "1.0.0",
        "status": doc.status,
        "currency": "INR",
        "date_created": localISOTime,
        "date_created_gmt": date,
        "date_modified": localISOTime,
        "date_modified_gmt": date,
        "discount_total": parseFloat(discount).toFixed(2).toString(),
        // "discount_tax":"0.00",
        "shipping_total": "0.00",
        // "shipping_tax":"0.00",
        // "cart_tax":"0.00",
        "total": parseFloat(doc.totalCost).toFixed(2).toString(),
        "prices_include_tax": false,
        "customer_id": 0,
        "customer_note": "",
        "billing": {
            "first_name": doc.shipping.first_name,
            "last_name": doc.shipping.last_name || 'NA',
            "company": "",
            "address_1": doc.shipping.address_1 + ',' + doc.shipping.address_2,
            "address_2": doc.shipping.locality,
            "city": doc.shipping.area,
            "state": "Kerala",
            "postcode": 111111,
            "country": "India",
            "email": "qqeq@mail.com",
            "Phone": doc.shipping.phNumber.toString() || "9999999999",
        },
        "shipping": {
            "first_name": doc.shipping.first_name,
            "last_name": doc.shipping.last_name || 'NA',
            "company": "",
            "address_1": doc.shipping.address_1 + ',' + doc.shipping.address_2,
            "address_2": doc.shipping.locality,
            "city": doc.shipping.area,
            "state": "Kerala",
            "postcode": 111111,
            "country": "India",
            "email": "qqeq@mail.com",
            "Phone": doc.shipping.phNumber || 9999999999,
        },
        "payment_method": "razorpay",
        "payment_method_title": "Razor pay",
        "transaction_id": "",
        "date_paid": localISOTime,
        "date_paid_gmt": date,
        "date_completed": null,
        "date_completed_gmt": null,
        "line_items": items,
        "shipping_lines": [],
        "fee_lines": [],
        "coupon_lines": []
    }
}


//-----------------------------------------------------------------------------------------------------------------------------------------//
exports.orders = functions.https.onRequest(async (req, res) => {
    if (!await auth(req.query, res)) return
    try {
        const date = new Date(Date.parse(req.query.after)) || (() => { throw new Error("date not given") })();
        const limit = parseInt(req.query.per_page) || 100;
        const page = parseInt(req.query.page) || 1;
        const status = req.query.status ? req.query.status.split(',') : [];
        var arr1 = [];
        try {
            const orderz = db.collection('orders')
            var order = await orderz.where("dateTime", ">=", date).orderBy("dateTime").get()
            if (status.length) {
                /* eslint-disable no-await-in-loop */
                for (let doc of order.docs) {
                    if (!doc.get('orderId')) {
                        let id = await getOrderID();
                        await orderz.doc(doc.id).update({ orderId: id });
                        let doc1 = await orderz.doc(doc.id).get();
                        arr1.push(doc1);
                    } else {
                        arr1.push(doc)
                    }
                }
                /* eslint-enable no-await-in-loop */
                var arr2 = [];
                arr2 = arr1.slice((page - 1) * limit, page * limit)
                if (arr2.length) {
                    var json = []
                    arr2.forEach(doc => {
                        json.push(orderJson(doc.data()))
                    })
                    res.status(200).json(json)
                } else {
                    res.status(404).json({ "date": date.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }), "error": "no documents in given time period" })
                }
            } else {
                res.status(404).json({ "date": date.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }), "error": "no status given" })
            }

        } catch (error) {
            res.status(500).json({ "date": date.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }), "error": error.toString() })
        }
    } catch (error) {
        res.status(500).json({ "error": error.toString() })
    }
})