const bcrypt = require('bcrypt-nodejs')

module.exports = app => {

    const { existOrError, notExistOrError, equalsOrError } = app.api.validation

    const encryptPassword = password => {
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(password, salt)
    }

    const save =  async (req, res) => {
    
        const user = { ...req.body }
        if(req.params.id)user.id = req.params.id

        if(!req.originalUrl.startsWith('/users'))user.admin = false
        if(!req.user || !req.user.admin)user.admin = false

        try{
            existOrError(user.name, 'Nome não informado')
            existOrError(user.email, 'Email não informado')
            existOrError(user.password, 'Senha não informada')
            existOrError(user.confirmPassword, 'Confirmaão da senha inválida')
            equalsOrError(user.password, user.confirmPassword, 
                'Senhas não conferem')

            const userFromDB = await app.db('users')
                    .where({email: user.email}).first()
            
            if(!user.id)notExistOrError(userFromDB, 'Usuário já cadastrado')
            
        }catch(msg){
            
            return res.status(400).send(msg)
        }

        user.password = encryptPassword(req.body.password)
        delete user.confirmPassword

        if(user.id){
            app.db('users')
                .update(user)
                .where({id: user.id})
                .whereNull('deletedAt')
                .then(_ => res.status(204).send())
                .catch(err => res.status(500).send(err))
        }
        else {
            app.db('users')
                .insert(user)
                .then(_ => res.status(204).send())
                .catch(err => res.status(500).send(err))
        }
    }

    const get = (req, res) => {
        app.db('users')
            .select('id', 'name', 'email', 'admin')
            .whereNull('deletedAt')
            .then(users => res.json(users))
            .catch(err => res.status(500).send())
    }

    const getById = (req, res) => {
        app.db('users')
            .select('id', 'name', 'email', 'admin')
            .where({id: req.params.id})
            .whereNull('deletedAt')
            .first()
            .then(user => res.json(user))
            .catch(err => res.status(500).send())
    }

    const remove = async (req, res) => {
        try {
            const articles = await app.db('articles')
                .where({ userId: req.params.id })
            notExistsOrError(articles, 'Usuário possui artigos.')

            const rowsUpdated = await app.db('users')
                .update({deletedAt: new Date()})
                .where({ id: req.params.id })
            existsOrError(rowsUpdated, 'Usuário não foi encontrado.')

            res.status(204).send()
        } catch(msg) {
            res.status(400).send(msg)
        }
    }


    return { save, get, getById, remove }
}