// shared/utils/formatters.js

// --- NOVA FUNÇÃO ---
export const escapeHTML = (str) => {
    const stringified = String(str ?? '');
    return stringified.replace(/[&<>"']/g, function (match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
        }[match];
    });
};
// -------------------

export const formatPrice = (price) => {
    const numericPrice = parseFloat(price);
    return isNaN(numericPrice)
        ? 'R$ 0,00'
        : numericPrice.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
          });
};

export const formatPhone = (phoneString) => {
    if (!phoneString || typeof phoneString !== 'string') {
        return '';
    }
    const cleaned = phoneString.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    return phoneString;
};

export const calculateDeliveryFee = (subtotal, modality, selectedBairro) => {
    if (modality !== 'delivery' || !selectedBairro) {
        return 0;
    }

    const taxa = parseFloat(selectedBairro.taxa_entrega) || 0;
    const minimoFreteGratis =
        parseFloat(selectedBairro.valor_minimo_frete_gratis) || 0;

    if (minimoFreteGratis > 0 && subtotal >= minimoFreteGratis) {
        return 0;
    }

    return taxa;
};

export const populateDobForm = (formIdPrefix) => {
    const daySelect = document.getElementById(`${formIdPrefix}-day`);
    const monthSelect = document.getElementById(`${formIdPrefix}-month`);
    const yearSelect = document.getElementById(`${formIdPrefix}-year`);

    if (!daySelect || daySelect.options.length > 1) return;

    daySelect.innerHTML = '<option value="">Dia</option>';
    for (let i = 1; i <= 31; i++) {
        daySelect.innerHTML += `<option value="${i}">${i}</option>`;
    }

    monthSelect.innerHTML = '<option value="">Mês</option>';
    const months = [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
    ];
    months.forEach((month, index) => {
        monthSelect.innerHTML += `<option value="${index + 1}">${month}</option>`;
    });

    yearSelect.innerHTML = '<option value="">Ano</option>';
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 18; i >= currentYear - 100; i--) {
        yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
    }
};

export const formatNumberWithThousandSeparator = (number) => {
    if (typeof number !== 'number') {
        number = parseInt(number, 10) || 0;
    }
    return number.toLocaleString('pt-BR');
};

export const isWithinSchedulingWindow = (operatingHours) => {
    if (!operatingHours) return false;

    const schedulingWindowMinutes =
        operatingHours.scheduling_window_minutes ?? 0;
    if (schedulingWindowMinutes <= 0) return false;

    const now = new Date();
    const dayOfWeek = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
    ][now.getDay()];
    const todaysHours = operatingHours[dayOfWeek];

    if (todaysHours && todaysHours.is_active === 'on') {
        // CORREÇÃO: Removida desestruturação de openHour/openMinute não utilizada

        const todayStr = now.toISOString().split('T')[0];
        const openingTime = new Date(
            `${todayStr}T${todaysHours.store_hours.open}:00`
        );

        const windowStartTime = new Date(
            openingTime.getTime() - schedulingWindowMinutes * 60000
        );

        return now >= windowStartTime && now < openingTime;
    }

    return false;
};

export const formatAddress = (address) => {
    if (!address || typeof address !== 'string') return '';
    try {
        return decodeURIComponent(address.replace(/\+/g, ' '));
    } catch {
        // CORREÇÃO: Removido 'e' não utilizado
        return address.replace(/\+/g, ' ');
    }
};
