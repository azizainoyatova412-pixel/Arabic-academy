const db = require('../db/index');
const path = require('path');
const fs = require('fs');

// Kitoblar ro'yxati
exports.getBooks = async (req, res) => {
  try {
    const books = await db.query('SELECT * FROM books ORDER BY id DESC');
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

// Yangi PDF kitob yuklash
exports.uploadBook = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Iltimos, PDF fayl tanlang' });
  }

  const title = (req.body.title || req.file.originalname.replace(/\.pdf$/i, '')).trim();
  const pdfPath = '/uploads/books/' + req.file.filename;
  const fileSize = req.file.size || 0;

  try {
    const result = await db.query(
      `INSERT INTO books (title, pdf_path, file_size)
       VALUES ($1, $2, $3) RETURNING *`,
      [title, pdfPath, fileSize]
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
    const bookRes = await db.query('SELECT * FROM books WHERE id = $1', [id]);
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
