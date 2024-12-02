
exports.getSalt = async (req, res) => {
    try {
        login = req.query.login;
        const salt = await userModel.getSalt(login);
        if (salt) {
            res.json({ salt });
        } else {
            res.status(404).json({ message: 'Salt global non trouvé' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération du salt global' });
    }
};

exports.login = async (req, res) => {
    try {
        let crypto = require('crypto');
        login = req.body.login;
        console.log(login)
        password = req.body.password;
        console.log(password)
        const salt = await userModel.getSalt(login);
        if (salt) {
            const hashedPassword = crypto.createHash('md5').update(password + salt).digest('hex');
            const user = await userModel.getLoginAndPassword(login, hashedPassword);
            if (user === true) {
                const token = await userModel.createToken(login, req);
                const tokenOk = await userModel.verifyToken(token);
                console.log(token);
                res.json({ token });
            } else {
                res.status(401).json({ message: 'Utilisateur ou mot de passe incorrect' });
            }
        } else {
            res.status(404).json({ message: 'Salt global non trouvé' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la connexion' });
    }

}