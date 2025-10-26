import React, { useState } from 'react';
import './FCumplimiento.css';

function FCumplimiento() {
  const [formData, setFormData] = useState({
    complianceName: '',
    complianceDate: '',
    details: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Form submitted:', formData);
  };

  return (
    <div className="fcumplimiento-container">
      <h2>Formulario de Cumplimiento</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="complianceName">Nombre de Cumplimiento:</label>
          <input
            type="text"
            id="complianceName"
            name="complianceName"
            value={formData.complianceName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="complianceDate">Fecha de Cumplimiento:</label>
          <input
            type="date"
            id="complianceDate"
            name="complianceDate"
            value={formData.complianceDate}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="details">Detalles:</label>
          <textarea
            id="details"
            name="details"
            value={formData.details}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}

export default FCumplimiento;