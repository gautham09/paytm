const express = require('express');

const jwt = require('jsonwebtoken');
const zod =require('zod');
const {User, Account} = require('../db');
const JWT_SECRET = require('../config');
const { authMiddleware } = require('../middleware');

const router = express.Router();

const signupBody = zod.object({
    username: zod.string().email(),
    password: zod.string(),
    firstName: zod.string(),
    lastName: zod.string(),
}
)

router.post("/signup",async function(req, res) {
    const body = req.body;
   const {success} = signupBody.safeParse(body);
   if(!success){
   return res.json({
        message: "invalid inputs"
    })
   }

   const existingUser = User.findOne({
    username: body.username
   })

   if(existingUser._id){
    return res.json({
        message: "Email already taken"
    })
   }

   const dbUser = await User.create(body);

   const token  = jwt.sign({
    userId: dbUser._id
   }, JWT_SECRET);

   res.json({
    message: "User created successfully",
    token: token
   })
})

const signinBody = zod.object({
    username: zod.string().email(),
    password: zod.string()
})

router.post('/signin', async function(req, res){
    const body = req.body;
    const {success} = signinBody.safeParse(body);

    if(!success){
        res.status(411).json({
            message: "incorrect credentials"
        });
    }

    const user = await User.findOne({
        username: body.username,
        password: body.password
    })

    if(user){
        const token = jwt.sign({
            userId: user._id
        }, JWT_SECRET);
        
        return res.json({
            token: token
        });
    }

    return res.json({
        message: "Error while logging in"
    })

})

const updateBody = zod.object({
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional(),
});

router.put('/', authMiddleware, async (req, res, next) => {
    const {success} = updateBody.safeParse(req.body);

    if(!success){
        res.status(411).json({
            message: 'error while updating information'
        });
    }

    await User.updateOne(req.body, {
        id: req.userId
    })

    res.json({
        message: "Updated successfully"
    })
})

router.get("/bulk", async (req, res) => {
    const filter = req.query.filter || "";

    const users = await User.find({
        $or: [{
            firstName: {
                "$regex": filter
            }
        }, {
            lastName: {
                "$regex": filter
            }
        }]
    })

    res.json({
        user: users.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            _id: user._id
        }))
    })
})

module.exports = router;