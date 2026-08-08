const board=document.querySelector('#board');
const pieces=['♜','♞','♝','♛','♚','♝','♞','♜','♟','♟','♟','♟','♟','♟','♟','♟','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','♙','♙','♙','♙','♙','♙','♙','♙','♖','♘','♗','♕','♔','♗','♘','♖'];
pieces.forEach((p,i)=>{let s=document.createElement('div');s.className='square '+((Math.floor(i/8)+i)%2?'dark':'light');s.textContent=p;board.appendChild(s)});
