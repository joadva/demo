'use client';

import { useCallback, useEffect, useState } from 'react';

import { ApiError, createCliente, deleteCliente, listClientes, updateCliente } from '@/lib/api';

const VACIO = { nombre: '', email: '', telefono: '' };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null); // clienteId o null para crear
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({}); // { campo: mensaje }
  const [estado, setEstado] = useState(null); // { tipo: 'ok'|'error', texto }

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { clientes } = await listClientes();
      setClientes(clientes);
      setEstado(null);
    } catch (err) {
      setEstado({ tipo: 'error', texto: describir(err) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const editar = (cliente) => {
    setEditando(cliente.clienteId);
    setForm({ nombre: cliente.nombre, email: cliente.email, telefono: cliente.telefono ?? '' });
    setErrores({});
  };

  const cancelar = () => {
    setEditando(null);
    setForm(VACIO);
    setErrores({});
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setErrores({});

    // telefono es opcional: si va vacio no se manda, para que el schema no lo
    // rechace por no cumplir el patron de 10 digitos.
    const datos = { nombre: form.nombre, email: form.email, ...form.telefono && { telefono: form.telefono } };

    try {
      if (editando === null) {
        await createCliente(datos);
        setEstado({ tipo: 'ok', texto: 'Cliente creado' });
      } else {
        await updateCliente(editando, datos);
        setEstado({ tipo: 'ok', texto: 'Cliente actualizado' });
      }
      cancelar();
      await cargar();
    } catch (err) {
      // Un 400 de la Lambda trae errores por campo; se pintan junto al input.
      if (err instanceof ApiError && err.errores.length) {
        setErrores(err.porCampo);
      }
      setEstado({ tipo: 'error', texto: describir(err) });
    }
  };

  const borrar = async (cliente) => {
    if (!confirm(`¿Borrar a ${cliente.nombre}?`)) return;
    try {
      await deleteCliente(cliente.clienteId);
      setEstado({ tipo: 'ok', texto: 'Cliente borrado' });
      await cargar();
    } catch (err) {
      setEstado({ tipo: 'error', texto: describir(err) });
    }
  };

  const campo = (nombre) => ({
    value: form[nombre],
    onChange: (e) => setForm({ ...form, [nombre]: e.target.value }),
    'aria-invalid': Boolean(errores[nombre])
  });

  return (
    <>
      <h1>Clientes</h1>
      <p className="suave">
        CRUD completo contra <code>/clientes</code>. Requiere que esas rutas estén
        desplegadas y con base de datos (ver <code>docs/clientes-example.md</code>).
      </p>

      <section className="tarjeta">
        <h3>{editando === null ? 'Nuevo cliente' : `Editando #${editando}`}</h3>
        <form onSubmit={guardar}>
          <label>
            Nombre
            <input {...campo('nombre')} required maxLength={120} />
            {errores.nombre && <span className="error-campo">{errores.nombre}</span>}
          </label>
          <label>
            Correo
            <input {...campo('email')} type="email" required maxLength={180} />
            {errores.email && <span className="error-campo">{errores.email}</span>}
          </label>
          <label>
            Teléfono (10 dígitos, opcional)
            <input {...campo('telefono')} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} />
            {errores.telefono && <span className="error-campo">{errores.telefono}</span>}
          </label>
          <div className="acciones">
            <button type="submit">{editando === null ? 'Crear' : 'Guardar'}</button>
            {editando !== null && <button type="button" className="secundario" onClick={cancelar}>Cancelar</button>}
          </div>
        </form>
        {estado && <p className={`estado ${estado.tipo}`}>{estado.texto}</p>}
      </section>

      <div className="acciones">
        <button className="secundario" onClick={cargar} disabled={cargando}>
          {cargando ? 'Cargando…' : 'Recargar'}
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Teléfono</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clientes.length === 0 && (
            <tr><td colSpan={5}>{cargando ? 'Cargando…' : 'Sin clientes'}</td></tr>
          )}
          {clientes.map((cliente) => (
            <tr key={cliente.clienteId}>
              <td>{cliente.clienteId}</td>
              <td>{cliente.nombre}</td>
              <td>{cliente.email}</td>
              <td>{cliente.telefono ?? '—'}</td>
              <td className="acciones-fila">
                <button className="secundario" onClick={() => editar(cliente)}>Editar</button>
                <button className="peligro" onClick={() => borrar(cliente)}>Borrar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/**
 * Texto para mostrar al usuario segun el tipo de error.
 * @param {Error} err
 * @return {string}
 */
const describir = (err) => {
  if (!(err instanceof ApiError)) return err.message;
  // API Gateway responde asi (no con 404) cuando la ruta no existe en el API.
  if (err.status === 403 && err.message === 'Missing Authentication Token') {
    return 'El API no tiene las rutas /clientes desplegadas todavía.';
  }
  // El detalle viene de API Gateway cuando el cuerpo no cumple el schema.
  return err.detalle ? `${err.message}: ${err.detalle}` : `${err.status} ${err.message}`;
};
