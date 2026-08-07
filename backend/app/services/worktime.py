from app.schemas.summary import WorkTime


def work_time(amount_cents: int, hourly_rate_cents: int | None, workday_hours: int) -> WorkTime | None:
    """Converte dinheiro em tempo de trabalho.

    É a ideia central do app: R$ 300 não diz muita coisa, "quase 2 dias de
    trabalho" diz. Retorna None quando o usuário ainda não informou o valor da
    hora — chutar um valor aqui seria inventar um número sobre o trabalho de
    alguém, e todo o resto do app trata None como "não mostrar".
    """
    if not hourly_rate_cents or hourly_rate_cents <= 0:
        return None

    workday = max(1, workday_hours)
    total_hours = amount_cents / hourly_rate_cents
    days = int(total_hours // workday)
    hours = round(total_hours - days * workday)
    # O arredondamento pode empurrar as horas até fechar um dia inteiro
    # ("0 dias e 8 horas" quando o dia tem 8h) — normaliza pra não exibir isso.
    if hours >= workday:
        days += 1
        hours -= workday
    return WorkTime(total_hours=round(total_hours, 2), days=days, hours=hours)
