import User from "../models/userSchema.js";

export async function getAllUsers(req, res) {
    try {
        const users = (await User.find());

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
        }
}

export async function createUser(req, res) {
    try {
        const { fullName } = req.body;

        const newUser = new User({ fullName });

        await newUser.save();

        res.status(201).json({
            message: "User Created Successfully",
        });

    } catch (error) {
        console.error("Error creating user: ", error);
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

export async function updateUser(req, res) {
    try {
        const { fullName } = req.body;

        const updateUser = await User.findByIdAndUpdate(
            req.params.id,
            { fullName },
            { new: true }
        );
        
        if (!updateUser) return res.status(404).json({ message: "User Not Found" });

        res.status(200).json({
            message: "User Updated Successfully",
            data: updateUser
        });
    } catch (error) {
        console.log("Error updating user: ", error);
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

export async function deleteUser(req, res) {
    try {
        const deleteUser = await User.findByIdAndDelete(req.params.id);

        if (!deleteUser) return res.status(404).json({ message: "User Not Found" });    

        res.status(200).json({
            message: "User Deleted Successfully",
        });

    } catch (error) {
        console.log("Error deleting user: ", error);
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}