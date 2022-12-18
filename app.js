const express = require('express')
const func = require('./callfunction')
const app = express()
const pool = require('./db')
const { check,validationResult } = require('express-validator')
const path = require('path');
const expressLayout = require('express-ejs-layouts');
const { name } = require('ejs');
const { body } = require('express-validator');
// const { isErrored } = require('stream');
const port = 3000
// const bodyParser = require('body-parser')
// const morgan = require('morgan')

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({extended : true}))

// parse application/json
// app.use(bodyParser.json())

//information using EJS
app.set('view engine', 'ejs')

//using third party express layout
app.use(expressLayout)

// app.use(morgan('dev'))

//fungsi middleware
app.use((req, res, next) => {
  console.log('Time:', Date.now())
  next()
})

//untuk memanggil file static dan semua ditangani oleh path public)
app.use(express.static(path.join(__dirname, 'public')))

// app.set('layout','layouts/layout')
// routing untuk path pada browser
app.get('/', (req,res) => {
  res.render('index', {
    layout : "layouts/main",
    title : "Halaman Index"
  })
})

//routing untuk path pada browser
app.get('/about', (req, res) => {
  res.render('about', {
    layout : "layouts/main",
    title : "Halaman About"
  })
})

//routing untuk path pada browser
app.get('/contact',async (req, res) => {
  const cont = await func.readData()
  console.log(cont); //opsional
  res.render('contact', {
    layout : "layouts/main",
    title : "Halaman Contact",
    cont,
  })
})

//routing untuk path add contact
app.get('/contact/add', (req, res) => {
  res.render('add-contact', {
    layout : "layouts/main",
    title : "Add new contact"
  })
});

app.post('/contact',
  //cek validasi email dan phone menggunakan check untuk mendapatkan custom alert message dari parameter kedua fungsi check 
  //ex : check('name(from form input name)', 'error message')
  check('name').custom(async (value) => {
    const duplicate = await func.duplicateData(value)
    // const duplicate = func.duplicate_data(value)
    if(duplicate){
      throw new Error('nama yang ditambahkan sudah terdaftar')
    }
    return true
  }),
  check('mobile', 'nomor telepon tidak sesuai format').isMobilePhone('id-ID'), 
  check('email', 'email salah').isEmail(),  
  async (req, res) => {
  //cek apakah ada kesalahan validasi dalam request ini
  const errors = validationResult(req);
  //cek apakah ada inputan yang tidak sesuai format
  if (!errors.isEmpty()) {
    res.render('add-contact', {
      layout : "layouts/main",
      title : "Add new contact",
      errors : errors.array() //menampilkan errors dalam bentuk array
    })
    // return res.status(400).json({ errors: errors.array() });
  }else{ //jika semua input sudah sesuai format, akan menjalankan fungsi data_add
    // console.log(req.body);
    await func.addData(req.body)
    res.redirect('/contact') //redirected ke halaman contact dan mengirimkan data jika memang semua format data benar
    // const name = req.body.name
    // const phone = req.body.phone
    // const email = req.body.email
    // func.data_add(name, email, phone)
  }
});

//route untuk melakukan penghapusan data
app.get('/contact/delete/:name', async (req, res) => {
  const name = req.params.name
  const cont = await func.deleteData(name) 
  //cek error handling
  if(!cont){
    res.status(404)
    res.send('gagal menghapus file')
  } else{
    cont[0]
    // func.del_data(req.params.name)
    res.redirect('/contact')
  }
})

//route untuk melakukan edit data
app.get('/contact/edit/:name', async (req, res) => {
  const name = req.params.name
  const cont = await func.findData(name)
  // const cont = func.findContact(req.params.name)
  res.render('edit-data', {
    layout : "layouts/main",
    title : "Edit data",
    cont : cont[0]
  })
});

// route untuk melakukan updating data
app.post('/contact/edit/:name',
  //cek validasi email dan phone menggunakan check untuk mendapatkan custom alert message dari parameter kedua fungsi check 
  check('name').custom( async (value) => {
    const {rows : existName} = await pool.query(`SELECT name FROM contacts WHERE name = '${name}'`)
    if (value === existName){
      throw new Error('Name already exist')
    }
    return true
  }),
  check('email', 'email salah').isEmail(),  
  check('mobile', 'nomor telepon tidak sesuai format').isMobilePhone('id-ID'), 
  async (req, res) => {
    const name = req.params.name
    const cont = await func.findData(name)
    //cek apakah ada kesalahan validasi dalam request ini
    const {rows : search} = await pool.query(`SELECT * FROM contacts WHERE name = '${req.params.name}'`)
    const errors = validationResult(req);
    //cek apakah ada inputan yang tidak sesuai format
    if (!errors.isEmpty()) {
      res.render('edit-data', {
        layout : "layouts/main",
        title : "Form ubah data",
        errors : errors.array(), //menampilkan errors dalam bentuk array
        search,
        cont,
        url : req.params.name
      })
      // return res.status(400).json({ errors: errors.array() });
    }else{ //jika semua input sudah sesuai format, akan menjalankan fungsi data_add
      await pool.query(`UPDATE contacts SET name = '${req.body.name}', mobile = '${req.body.mobile}', email = '${req.body.email}' WHERE name = '${req.body.oldName}'`)
      res.redirect('/contact')
      // func.updt_data(req.body)
      // res.redirect('/contact') //redirected ke halaman contact dan mengirimkan data jika memang semua format data benar
      // res.send(req.body)
      // console.log(req.body);
      // const name = req.body.name
      // const phone = req.body.phone
      // const email = req.body.email
      // func.data_add(name, email, phone)
      // func.updt_data(req.body)
    }
});

//routing untuk path pada browser
app.get('/contact/:name', async (req, res) => {
  //untuk mengirimkan nilai ke parameter dengan menggunakan req.params (contoh kasus disini menggunakan :name)
  const name = req.params.name;
  const url = req.params.name
  const cont = await func.findData(name) 
  res.render('detail', {
    layout : "layouts/main",
    title : "Halaman Detail",
    cont : cont[0],
    url
  })
})

//route untuk menunjukkan status code 404 jika path url tidak ditentukan
app.use('/', (req, res) => {
  res.status(404)
  res.send('page not found')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})  