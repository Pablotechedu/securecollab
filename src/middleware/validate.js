function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message);
      return res.status(422).json({ error: 'Validation failed', details });
    }

    req.body = value;
    next();
  };
}

export default validate;
