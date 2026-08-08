const board=document.getElementById('board');

const pieces=[
'♜','♞','♝','♛','♚','♝','♞','♜',
'♟','♟','♟','♟','♟','♟','♟','♟',
'','','','','','','','',
'','','','','','','','',
'','','','','','','','',
'','','','','','','','',
'♙','♙','♙','♙','♙','♙','♙','♙',
'♖','♘','♗','♕','♔','♗','♘','♖'
];

pieces.forEach((piece,i)=>{
 const div=document.createElement('div');
 div.className='square '+((Math.floor(i/8)+i)%2?'dark':'light');
 div.textContent=piece;
 board.appendChild(div);
});
