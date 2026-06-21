document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.matching__step');
    const result = document.querySelector('.matching__result');
    const prevBtn = document.getElementById('matching-prev');
    const nextBtn = document.getElementById('matching-next');
    const restartBtn = document.getElementById('matching-restart');
    const resultList = document.getElementById('matching-result-list');

    let currentStep = 0;
    const answers = {};

    if (!steps.length) return;

    function updateStep() {
        steps.forEach((step, index) => {
            step.classList.toggle('is-active', index === currentStep);
        });

        if (prevBtn) {
            prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
        }

        if (nextBtn) {
            nextBtn.textContent = currentStep === steps.length - 1 ? 'Ver resultados' : 'Siguiente';
        }
    }

    function collectAnswer() {
        const activeStep = steps[currentStep];
        const inputs = activeStep.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked, select');
        const stepName = activeStep.dataset.step;

        const values = Array.from(inputs).map(input => input.value);
        if (values.length) {
            answers[stepName] = values;
        }
    }

    function showResults() {
        steps.forEach(step => step.classList.remove('is-active'));
        if (result) {
            result.classList.add('is-active');
        }

        if (nextBtn) nextBtn.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'none';

        // Perfiles de ejemplo según respuestas
        const matchedTherapists = getMatchedTherapists(answers);

        if (resultList) {
            resultList.innerHTML = matchedTherapists.map(t => `
                <article class="therapist-card">
                    <div class="therapist-card__avatar">${t.initials}</div>
                    <div class="therapist-card__info">
                        <h4>${t.name}</h4>
                        <p class="therapist-card__meta">${t.title} · ${t.experience}</p>
                        <p>${t.bio}</p>
                        <div class="therapist-card__tags">
                            ${t.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                </article>
            `).join('');
        }
    }

    function getMatchedTherapists(answers) {
        // Lógica de ejemplo; en producción vendría del backend
        const focus = answers.focus ? answers.focus[0] : 'duelo';
        const modality = answers.modality ? answers.modality[0] : 'individual';

        const therapists = [
            {
                initials: 'MR',
                name: 'Dra. María Rodríguez',
                title: 'Psicóloga · Tanatóloga',
                experience: '12 años de experiencia',
                bio: 'Especialista en duelo por muerte y pérdidas significativas. Acompañamiento empático y basado en evidencia.',
                tags: ['Duelo', 'Ansiedad', 'Adultos mayores'],
                specialties: ['duelo', 'ansiedad', 'adultos-mayores']
            },
            {
                initials: 'JL',
                name: 'Lic. Javier López',
                title: 'Psicólogo Clínico',
                experience: '8 años de experiencia',
                bio: 'Enfoque cognitivo-conductual para crisis vitales, rupturas y adaptación al cambio.',
                tags: ['Ruptura', 'Estrés', 'Terapia de pareja'],
                specialties: ['ruptura', 'estres', 'pareja']
            },
            {
                initials: 'SC',
                name: 'Dra. Sofía Castro',
                title: 'Tanatóloga · Psicooncóloga',
                experience: '10 años de experiencia',
                bio: 'Acompañamiento en enfermedad crónica, cuidados paliativos y duelo anticipado.',
                tags: ['Duelo anticipado', 'Oncología', 'Familias'],
                specialties: ['duelo', 'enfermedad-cronica', 'familias']
            }
        ];

        return therapists.filter(t => t.specialties.includes(focus) || t.specialties.includes(modality)).slice(0, 3);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            collectAnswer();

            if (currentStep < steps.length - 1) {
                currentStep++;
                updateStep();
            } else {
                showResults();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateStep();
            }
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            currentStep = 0;
            Object.keys(answers).forEach(key => delete answers[key]);

            steps.forEach(step => {
                const inputs = step.querySelectorAll('input');
                inputs.forEach(input => {
                    input.checked = false;
                });
            });

            if (result) result.classList.remove('is-active');
            if (nextBtn) nextBtn.style.display = 'inline-flex';
            if (prevBtn) {
                prevBtn.style.display = 'inline-flex';
                prevBtn.style.visibility = 'hidden';
            }

            updateStep();
        });
    }

    updateStep();
});
