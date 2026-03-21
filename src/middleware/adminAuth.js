import jwt from 'jsonwebtoken';


const userAuth = async (req, res, next) => {
    const {token} = req.cookies;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: No token provided"
        })
    }

    try {

        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded Token: ", tokenDecode);

        if (tokenDecode.id) {
            req.body.userId = tokenDecode.id;
        } else {
            return res.json({
                success: false,
                message: "Unauthorized: Invalid token"
            })
        }

        next(); 
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Invalid token"
        })
    }

}

export default userAuth;