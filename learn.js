const examples={
 order:[['2 + 3 × 4','Se etter regnetegnet som skal brukes først.'],['2 + 12','Regn ganging først: 3 × 4 = 12.'],['14','Legg til 2. Svaret er 14.']],
 parentheses:[['(2 + 3) × 4','Nå står plussstykket inne i parentesen.'],['5 × 4','Regn parentesen først: 2 + 3 = 5.'],['20','Gang med 4. Samme tall, annen rekkefølge – og et annet svar.']],
 power:[['2³','2 i tredje betyr ikke 2 × 3.'],['2 × 2 × 2','Tre like faktorer. Eksponenten teller faktorene.'],['4 × 2','Regn de to første faktorene.'],['8','2 i tredje er 8. I spillet skriver du 2^3.']],
 factorial:[['4!','Ett tegn, flere faktorer.'],['4 × 3 × 2 × 1','Gang heltallene fra 4 og ned til 1.'],['12 × 2 × 1','4 × 3 = 12.'],['24','4! = 24. Du bruker bare 4-terningen og tegnet !.']]
};
document.querySelectorAll('[data-example]').forEach(container=>{let step=0;const steps=examples[container.dataset.example];const render=()=>{container.querySelector('[data-math]').textContent=steps[step][0];container.querySelector('[data-note]').textContent=steps[step][1];container.querySelector('[data-next]').disabled=step===steps.length-1;};container.querySelector('[data-next]').addEventListener('click',()=>{step=Math.min(step+1,steps.length-1);render();});container.querySelector('[data-reset]').addEventListener('click',()=>{step=0;render();});});
document.querySelectorAll('[data-practice]').forEach(link=>link.addEventListener('click',()=>{try{sessionStorage.setItem('terningmatte-practice',link.dataset.practice);}catch{}}));
