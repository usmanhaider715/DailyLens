export function validateRequest(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, check] of Object.entries(schema)) {
      if (check.required && (req.body[field] === undefined || req.body[field] === '')) {
        errors.push(`${field} is required`);
      }
    }
    if (errors.length) return res.status(400).json({ errors });
    next();
  };
}
