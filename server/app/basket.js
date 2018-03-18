const bcypt = require('bcrypt')

module.exports = (db, twilio) => {
  return {
    add: (user, productId, quantity, cb) => {
      db.model.Product.findOne({ _id: productId }, (err,product) => {
        if(err){ cb(err); return }
        db.model.User.update({ _id: user._id },{
          $push: {
            basket: {
              product: productId,
              'quantity': quantity
            }
          },
          $set: {
            basketTotal: user.basketTotal + product.price
          }
        }, err => {
          if(err) { cb(err); return }
          cb()
        })
      })

    },
    complete: (user, formData, cb) => {
      db.model.User.findOne({ _id: user._id }, (err, user) => {
        let orders = [];
        let status = [];
        for(let i=0; i<user.basket.length;i++){
          current = user.basket[i];
          let newID = user.email + Date.now() + current.product;
          let salt = bcrypt.genSaltSync(5);
          newID = bcrypt.hashSync(newID, salt);
          newID = newID.substring(1,10);
          let temp = {
            orderNumber: newID,
            quantity: current.quantity,
            product: current.product,
            customer: user._id,
            status: "Processing",
            address: {
              postcode: formData.postcode,
              streetName: formData.streetName,
              streetNo: formData.streetNo
            }
          }
          twilio.sendProductOrderNotice(temp);
          orders.push(temp);

          db.model.User.update( { _id: user._id }, { $set : { basket: [], basketTotal:0 }})

          try {
            db.model.Order.insertMany(orders);
            cb(null)
          } catch(e) {
            cb(e)
          }

        };


      })
    }
  }
}
