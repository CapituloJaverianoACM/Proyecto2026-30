#import "@preview/diagraph:0.3.2": raw-render

#set page(paper: "a5")
#set heading(numbering: "1.")

#show link: set text(fill: blue, weight: 700)
#show link: underline

#align(center)[
  #text(size: 16pt, weight: "bold")[Proyecto: Web de Obsidian] \
  #v(1em)
]

= Contexto
El presente proyecto tiene como propósito desarrollar una aplicación web inspirada en Obsidian, permitiendo a los usuarios crear, organizar y enlazar notas en formato Markdown. Se busca replicar la experiencia del grafo de conocimiento y los enlaces bidireccionales en un entorno accesible desde cualquier navegador.

= Roles e integrantes
- *Andres Felipe Cortes Muñoz:* Backend, Frontend
- *Ana Maria Murcia Gomez:* Backend
- *Adam Kalel Ordoñez Herrera:* Backend
- *Ivan Santiago Lastra Romero:* [Definir rol]
- *Martin David Sanmiguel Delgado:* Backend, Frontend
- *Nicolas Castañeda Vargas:* Backend, Frontend
- *Nicolas Ricardo Bustos Puerto:* Backend
- *Nicolas Torres Roa:* Frontend
- *Salomon Alfredo Avila Larrotta:* [Definir rol]

= Objetivos (alcance del proyecto)
//Desarrollarlo
= Diagrama arquitectura
// Espacio para la arquitectura web

== Diagrama entidad relacion
A continuación se detalla el modelo de datos inicial. Se ha estructurado para soportar notas, carpetas recursivas y un sistema de relaciones de muchos a muchos para los enlaces.

#align(center)[
  #image("diagramaER.svg", width: 95%)
]

= Requisitos
== *Requisitos Funcionales:* \
*Modulo basico:*
 - El sistema debe permitir crear una cuenta.
 - El sistema debe permitir iniciar sesion.
 - El sistema debe permitir crear carpetas.
- El sistema debe permitir crear notas.
- El sistema debe permitir crear notas dentro de carpetas.
- El sistema debe permitir crear carpetas dentro de carpetas.
- El sistema debe permitir cambiar el nombre de una carpeta.
- El sistema debe permitir cambiar la ubicacion de una nota.
- El sistema debe permitir eliminar una nota.
- El sistema debe permitir eliminar una carpeta.
- El sistema debe permitir cambiar el nombre de una nota.
- El sistema debe permitir cambiar el nombre de una carpeta.
- El sistema debe permitir establecer relaciones entre varias notas.
- El sistema debe permitir generar un grafo de conocimientos.
- El sistema debe permitir consultar el grafo de conocimientos
*Modulo de personalizacion:*
- El sistema debe permitir agregar etiquetas con titulos y colores a las notas (para agruparlas, por temas, etc).
- El sistema debe permitir personalizar los colores de la interfaz.
*Modulo de colaboracion:*
- El sistema debe permitir compartir una nota con varios usuarios.
- El sistema debe permitir compartir una carpeta con varios usuarios.
- El sistema debe permitir el trabajo colaborativo paralelo y concurrente con una o varias personas en una nota.
- El sistema debe permitir el trabajo colaborativo paralelo y concurrente con una o varias personas en una carpeta.
- El sistema debe permitir crear una copia de una nota compartida.
- El sistema debe permitr crear una copia de una carpeta compartida.
- el sistma debe permitir administrar el acceso a una nota (el dueño podra decidir si la nota se puede editar, o solo leer, o solo comentar)
- El sistema debe permitir crear equipos/organizaciones.
*Modulo de gestion de proyectos:*
- el sistema debe permitir crear un proyecto
- el sistema debe permitir asignar tareas a los usuarios
- el sistema debe permitir realizar una planeacion del proyecto (planing poker, tablero kanban)
*Modulo de guardado*
- El sistema debe permitir descargar todo el contenido de un usuario.
*Modulo de IA:*

*Requisitos No Funcionales:*

