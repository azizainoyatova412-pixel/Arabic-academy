const db = require('../db/index');
const path = require('path');
const fs = require('fs');

// Kitoblar ro'yxati
exports.getBooks = async (req, res) => {
  try {
    const books = await db.query(
      'SELECT id, title, pdf_path, file_size, created_at FROM books ORDER BY id DESC'
    );
    const groups = await db.query('SELECT id, name, book_name, book_pdf_path FROM groups');

    const mappedBooks = books.rows.map((b) => {
      const attachedGroups = groups.rows
        .filter((g) => g.book_name === b.title || g.book_pdf_path === b.pdf_path)
        .map((g) => ({ id: g.id, name: g.name }));

      return {
        ...b,
        attachedGroups,
      };
    });

    res.json({ success: true, books: mappedBooks });
  } catch (err) {
    console.error('getBooks xatolik:', err.message);
    res.status(500).json({ error: 'Kitoblar ro‘yxatini olib bo‘lmadi' });
  }
};

exports.getBotBooks = async (_req, res) => {
  try {
    const result = await db.query('SELECT id, title, pdf_path AS "pdfPath" FROM books ORDER BY id DESC');
    res.json({ books: result.rows });
  } catch (err) {
    console.error('Bot kitoblar ro‘yxatini olishda xatolik:', err.message);
    res.status(500).json({ error: 'Kitoblar ro‘yxatini olib bo‘lmadi' });
  }
};

exports.getBotBook = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Kitob ID noto‘g‘ri' });
  }

  try {
    const result = await db.query(
      'SELECT id, title, pdf_path AS "pdfPath" FROM books WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kitob topilmadi' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Bot kitobini olishda xatolik:', err.message);
    return res.status(500).json({ error: 'Kitobni olib bo‘lmadi' });
  }
};

exports.getBotGroupBook = async (req, res) => {
  const groupId = Number(req.params.groupId);
  const telegramId = Number(req.body.telegram_id);
  if (!Number.isSafeInteger(groupId) || groupId <= 0 || !Number.isSafeInteger(telegramId) || telegramId <= 0) {
    return res.status(400).json({ error: 'Guruh yoki Telegram ID noto‘g‘ri' });
  }

  try {
    const result = await db.query(
      `SELECT b.id, b.title, b.pdf_path AS "pdfPath"
       FROM groups g
       JOIN enrollments e ON e.group_id = g.id AND e.telegram_id = $2 AND e.status = 'active'
       JOIN books b ON (b.pdf_path = g.book_pdf_path OR b.title = g.book_name)
       WHERE g.id = $1
       LIMIT 1`,
      [groupId, telegramId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guruhga kitob biriktirilmagan yoki o‘quvchi guruhga yozilmagan' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Bot guruh kitobini olishda xatolik:', err.message);
    return res.status(500).json({ error: 'Guruh kitobini olib bo‘lmadi' });
  }
};

exports.serveBookFile = async (req, res, next) => {
  const filename = path.basename(req.params.filename);
  if (filename !== req.params.filename) {
    return res.status(404).json({ error: 'Kitob fayli topilmadi' });
  }

  try {
    const result = await db.query(
      'SELECT pdf_data, pdf_content_type FROM books WHERE pdf_path = $1 OR pdf_path LIKE $2 LIMIT 1',
      [`/uploads/books/${filename}`, `%${filename}`]
    );
    const book = result.rows[0];
    if (book?.pdf_data) {
      res.setHeader('Content-Type', book.pdf_content_type || 'application/pdf');
      res.setHeader('Content-Length', book.pdf_data.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(book.pdf_data);
    }

    const localFilePath = path.join(__dirname, '../../uploads/books', filename);
    if (fs.existsSync(localFilePath)) {
      return res.sendFile(localFilePath);
    }

    const backendFilePath = path.join(__dirname, '../uploads/books', filename);
    if (fs.existsSync(backendFilePath)) {
      return res.sendFile(backendFilePath);
    }

    return res.status(404).json({ error: 'Kitob fayli topilmadi' });
  } catch (err) {
    console.error('Kitob PDF faylini olishda xatolik:', err.message);
    return res.status(500).json({ error: 'Kitob faylini olib bo‘lmadi' });
  }
};

// Yangi PDF kitob yuklash
exports.uploadBook = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Iltimos, PDF fayl tanlang' });
  }
  if (!req.file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    return res.status(400).json({ error: 'Yuklangan fayl haqiqiy PDF emas' });
  }

  const title = (req.body.title || req.file.originalname.replace(/\.pdf$/i, '')).trim();
  const ext = path.extname(req.file.originalname || '.pdf') || '.pdf';
  const filename = req.file.filename || `book_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  const pdfPath = '/uploads/books/' + filename;
  const fileSize = req.file.size || 0;

  try {
    const dir = path.join(__dirname, '../uploads/books');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), req.file.buffer);
  } catch (fsErr) {
    console.warn('Faylni diskka saqlashda ogohlantirish:', fsErr.message);
  }

  try {
    const result = await db.query(
      `INSERT INTO books (title, pdf_path, file_size, pdf_data, pdf_content_type)
       VALUES ($1, $2, $3, $4, 'application/pdf') RETURNING id, title, pdf_path, file_size, created_at`,
      [title, pdfPath, fileSize, req.file.buffer]
    );

    res.status(201).json({
      success: true,
      message: `"${title}" kitobi muvaffaqiyatli yuklandi!`,
      book: result.rows[0],
    });
  } catch (err) {
    console.error('uploadBook xatolik:', err.message);
    res.status(500).json({ error: 'Kitobni saqlab bo‘lmadi' });
  }
};

// Kitobni o'chirish
exports.deleteBook = async (req, res) => {
  const { id } = req.params;
  try {
    const bookRes = await db.query(
      'SELECT id, title, pdf_path FROM books WHERE id = $1',
      [id]
    );
    if (bookRes.rows.length === 0) {
      return res.status(404).json({ error: 'Kitob topilmadi' });
    }

    const book = bookRes.rows[0];
    const fileName = path.basename(book.pdf_path);
    const diskPath = path.join(__dirname, '../../uploads/books', fileName);

    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch (fErr) {
        console.warn('Faylni o‘chirishda ogohlantirish:', fErr.message);
      }
    }

    // Guruhlardan biriktirilgan kitobni olib tashlash
    await db.query(
      'UPDATE groups SET book_name = NULL, book_pdf_path = NULL WHERE book_name = $1 OR book_pdf_path = $2',
      [book.title, book.pdf_path]
    ).catch(() => {});

    await db.query('DELETE FROM books WHERE id = $1', [id]);

    res.json({ success: true, message: 'Kitob muvaffaqiyatli o‘chirildi' });
  } catch (err) {
    console.error('deleteBook xatolik:', err.message);
    res.status(500).json({ error: 'Kitobni o‘chirib bo‘lmadi' });
  }
};

// Guruhga kitob biriktirish
exports.attachBookToGroup = async (req, res) => {
  const { groupId } = req.params;
  const { bookId } = req.body;

  try {
    if (!bookId) {
      // Biriktirishni bekor qilish
      await db.query(
        'UPDATE groups SET book_name = NULL, book_pdf_path = NULL WHERE id = $1',
        [groupId]
      );
      return res.json({ success: true, message: 'Guruhdan kitob biriktirishi olib tashlandi' });
    }

    const bookRes = await db.query('SELECT * FROM books WHERE id = $1', [bookId]);
    if (bookRes.rows.length === 0) {
      return res.status(404).json({ error: 'Kitob topilmadi' });
    }

    const book = bookRes.rows[0];
    await db.query(
      'UPDATE groups SET book_name = $1, book_pdf_path = $2 WHERE id = $3',
      [book.title, book.pdf_path, groupId]
    );

    res.json({
      success: true,
      message: `"${book.title}" kitobi guruhga biriktirildi!`,
      book_name: book.title,
      book_pdf_path: book.pdf_path,
    });
  } catch (err) {
    console.error('attachBookToGroup xatolik:', err.message);
    res.status(500).json({ error: 'Guruhga kitob biriktirishda xatolik' });
  }
};
