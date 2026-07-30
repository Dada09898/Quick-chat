export function spawnReactionParticles(element: HTMLElement, emoji: string) {
  const rect = element.getBoundingClientRect();
  const container = document.body;

  for (let i = 0; i < 6; i++) {
    const particle = document.createElement('div');
    particle.innerText = emoji;
    particle.style.position = 'fixed';
    particle.style.left = `${rect.left + rect.width / 2}px`;
    particle.style.top = `${rect.top}px`;
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '9999';
    particle.style.fontSize = '18px';
    particle.style.transform = 'translate(-50%, -50%)';

    container.appendChild(particle);

    const angle = (Math.PI / 4) + (Math.random() * (Math.PI / 2));
    const distance = 40 + Math.random() * 50;
    const destX = (Math.cos(angle) - 0.5) * distance;
    const destY = -Math.sin(angle) * distance;

    const anim = particle.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 1 },
        { transform: `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(1.4)`, opacity: 0 }
      ],
      {
        duration: 800 + Math.random() * 300,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        fill: 'forwards'
      }
    );

    anim.onfinish = () => particle.remove();
  }
}
