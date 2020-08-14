const db = require('./models/index');
const User = require('./models/user.model');
const SetTransactionVerify = require('./calculate_moving_price/setTransactionAsVerified');


(async () => {
    db.useMainDB();
    await db.isReady();
    // const users = await User.model().findAll({});
    // console.log(users.map(u => u.id));
    try {
        const setTransactionVerify = new SetTransactionVerify();
        await setTransactionVerify.verify('b195eb02-c227-41a5-9751-4d8ede56d26c')
    } catch (error) {
        console.log(error);
    }
})()
