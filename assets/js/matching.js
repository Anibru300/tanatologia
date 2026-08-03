document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.matching__step');
    const result = document.querySelector('.matching__result');
    const prevBtn = document.getElementById('matching-prev');
    const nextBtn = document.getElementById('matching-next');
    const restartBtn = document.getElementById('matching-restart');
    const resultList = document.getElementById('matching-result-list');
    const progressFill = document.getElementById('progress-fill');
    const nav = document.getElementById('matching-nav');

    let currentStep = 0;
    const totalSteps = steps.length; // welcome + 3 preguntas
    const answers = {};

    if (!steps.length) return;

    function updateProgress() {
        if (!progressFill) return;
        const progress = ((currentStep) / (totalSteps - 1)) * 100;
        progressFill.style.width = `${Math.min(progress, 100)}%`;
    }

    function updateStep() {
        steps.forEach((step, index) => {
            step.classList.toggle('is-active', index === currentStep);
        });

        if (prevBtn) {
            prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
            prevBtn.textContent = 'Anterior';
        }

        if (nextBtn) {
            if (currentStep === 0) {
                nextBtn.textContent = 'Comenzar';
            } else if (currentStep === totalSteps - 1) {
                nextBtn.textContent = 'Ver resultados';
            } else {
                nextBtn.textContent = 'Siguiente';
            }
        }

        updateProgress();
    }

    function getStepName() {
        return steps[currentStep].dataset.step;
    }

    function collectAnswer() {
        const activeStep = steps[currentStep];
        const inputs = activeStep.querySelectorAll('input[type="radio"]:checked');
        const stepName = getStepName();

        const values = Array.from(inputs).map(input => input.value);
        if (values.length) {
            answers[stepName] = values[0];
        }
    }

    function hasSelection() {
        const activeStep = steps[currentStep];
        return activeStep.querySelectorAll('input[type="radio"]:checked').length > 0;
    }

    function showError() {
        const activeStep = steps[currentStep];
        let error = activeStep.querySelector('.matching__error');
        if (!error) {
            error = document.createElement('p');
            error.className = 'matching__error';
            error.style.cssText = 'color: var(--color-error); text-align: center; margin-top: 1rem; font-size: 0.95rem;';
            activeStep.appendChild(error);
        }
        error.textContent = 'Por favor, elige una opción para continuar. Recuerda que no hay prisa.';
    }

    function clearError() {
        const activeStep = steps[currentStep];
        const error = activeStep.querySelector('.matching__error');
        if (error) error.remove();
    }

    function showResults() {
        steps.forEach(step => step.classList.remove('is-active'));
        if (result) {
            result.classList.add('is-active');
        }

        if (nextBtn) nextBtn.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nav) nav.style.display = 'none';

        const matchedTherapists = getMatchedTherapists(answers);

        if (resultList) {
            resultList.innerHTML = matchedTherapists.map(t => `
                <a href="/app/#/register?role=patient" class="therapist-card therapist-card--link" title="Crear cuenta gratis y agendar con ${t.name}">
                    <img src="${t.photo}" alt="Foto de ${t.name}" class="therapist-card__photo">
                    <div class="therapist-card__info">
                        <h4>${t.name}</h4>
                        <p class="therapist-card__meta">${t.title} · ${t.experience}</p>
                        <p>${t.bio}</p>
                        <div class="therapist-card__tags">
                            ${t.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                        <span class="therapist-card__cta">Elegir y crear mi cuenta gratis →</span>
                    </div>
                </a>
            `).join('');
        }

        updateProgress();
    }

    function getMatchedTherapists(answers) {
        const service = answers.service || 'aislada';
        const focus = answers.focus || 'otra';

        const serviceLabels = {
            aislada: 'Consulta aislada',
            bienestar: 'Programa de Salud Mental (4 sesiones)',
            duelo: 'Programa de acompañamiento por duelo, muerte o pérdida (6 sesiones)'
        };

        const serviceNote = serviceLabels[service] || serviceLabels.aislada;

        const therapists = [
            {
                name: 'Dra. Lupita Muñoz Campuzano',
                title: 'Fundadora · Psicóloga',
                experience: 'Salud mental y acompañamiento emocional',
                photo: '../assets/images/fundadoras/lupita.jpg',
                bio: `Dedicada a hacer accesible la salud mental para todas las personas. Puede acompañarte en tu ${serviceNote.toLowerCase()}.`,
                tags: ['Ansiedad', 'Depresión', 'Bienestar'],
                specialties: ['ansiedad-estres', 'depresion', 'otra', 'bienestar']
            },
            {
                name: 'Dra. Edith González Huerta',
                title: 'Fundadora · Tanatóloga',
                experience: 'Acompañamiento en duelo, muerte y pérdida',
                photo: '../assets/images/fundadoras/edith.jpg',
                bio: `Impulsa un acompañamiento humano y profesional para atravesar la pérdida. Puede guiar tu ${serviceNote.toLowerCase()}.`,
                tags: ['Duelo', 'Pérdida', 'Duelo anticipado'],
                specialties: ['duelo-muerte', 'perdida', 'enfermedad', 'duelo']
            }
        ];

        // Si el servicio es bienestar, priorizamos psicólogos; si es duelo, tanatólogos.
        const sortedTherapists = therapists.sort((a, b) => {
            const aMatch = a.specialties.includes(focus) ? 2 : (service === 'duelo' && a.title.includes('Tanatólogo') ? 1 : 0);
            const bMatch = b.specialties.includes(focus) ? 2 : (service === 'duelo' && b.title.includes('Tanatólogo') ? 1 : 0);
            return bMatch - aMatch;
        });

        return sortedTherapists.slice(0, 3);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            clearError();

            if (currentStep > 0 && !hasSelection()) {
                showError();
                return;
            }

            collectAnswer();

            if (currentStep < totalSteps - 1) {
                currentStep++;
                updateStep();
            } else {
                showResults();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            clearError();
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
                const error = step.querySelector('.matching__error');
                if (error) error.remove();
            });

            if (result) result.classList.remove('is-active');
            if (nextBtn) nextBtn.style.display = 'inline-flex';
            if (prevBtn) {
                prevBtn.style.display = 'inline-flex';
                prevBtn.style.visibility = 'hidden';
            }
            if (nav) nav.style.display = 'flex';

            updateStep();
        });
    }

    updateStep();
});
