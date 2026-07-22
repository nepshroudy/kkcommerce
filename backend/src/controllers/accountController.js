const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

exports.profile = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
  if (!user) return res.status(404).json({ message: 'Account not found' });
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { name }, select: { id: true, name: true, email: true, role: true } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Could not update profile', error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) return res.status(400).json({ message: 'Current password and a new password of at least 8 characters are required' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = user && await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Could not change password', error: error.message });
  }
};
